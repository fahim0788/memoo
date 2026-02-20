# Post-Mortem : Systeme de Synchronisation Offline-First

**Date** : 2026-02-19
**Scope** : Systeme complet de sync offline-first (IndexedDB + queue d'operations + reviews)
**Tests** : 211 tests, 11 fichiers - tous passent

---

## Table des matieres

1. [Resume executif](#resume-executif)
2. [Architecture du systeme](#architecture-du-systeme)
3. [Inventaire des 10 bugs identifies et corriges](#inventaire-des-10-bugs)
4. [Verification du traitement](#verification-du-traitement)
5. [Bugs supplementaires identifies (audit)](#bugs-supplementaires)
6. [Failles de securite](#failles-de-securite)
7. [Ameliorations recommandees](#ameliorations)
8. [Fichiers modifies](#fichiers-modifies)

---

## Resume executif

Audit complet du systeme offline-first de MemoList. 10 bugs critiques identifies et corriges dans le code client. L'audit approfondi a revele 6 problemes supplementaires (dont 2 critiques cote serveur) et 3 points de securite.

### Etat avant correction
- Race conditions sur les ecritures IDB concurrentes
- Perte silencieuse d'operations en queue
- Aucune notification utilisateur en cas d'echec permanent
- Reviews dupliquees en queue et en base
- Donnees d'un compte precedent accessibles apres logout

### Etat apres correction
- Mutex async (`withLock`) sur toutes les operations read-modify-write
- Rollback atomique avec snapshot + event `sync-rollback`
- Detection 401 + event `auth-expired`
- Deduplication reviews par cardId + `reviewId`
- Nettoyage complet IDB au logout

---

## Architecture du systeme

```
┌─────────────────────────────────────────────┐
│                  UI (React)                  │
│  useSyncStatus.ts  ←  events custom DOM     │
└──────────┬──────────────────────┬────────────┘
           │                      │
     ┌─────▼──────┐        ┌─────▼──────┐
     │ api-cache   │        │   sync.ts   │
     │ (listes)    │        │ (reviews)   │
     └─────┬──────┘        └─────┬──────┘
           │                      │
     ┌─────▼──────┐              │
     │offline-queue│              │
     └─────┬──────┘              │
           │                      │
     ┌─────▼──────────┐          │
     │  sync-manager   │          │
     │ (orchestrateur) │          │
     └─────┬──────────┘          │
           │                      │
     ┌─────▼──────────────────────▼────┐
     │         idb.ts (IndexedDB)       │
     │  withLock() = mutex async        │
     └─────────────────────────────────┘
```

**Deux systemes de sync independants :**
1. **Operations sur les listes** : `offline-queue.ts` + `sync-manager.ts` + `api-cache.ts`
2. **Reviews de cartes** : `sync.ts`

---

## Inventaire des 10 bugs

### BUG 1 - Race condition sur les ecritures IDB concurrentes
| | |
|---|---|
| **Severite** | CRITIQUE |
| **Impact** | Perte d'operations en queue, etat IDB corrompu |
| **Cause racine** | `getQueue()` + `push()` + `idbSet()` non atomique = read-modify-write sans verrou |
| **Scenario** | 2 `enqueue()` concurrents lisent la meme queue, chacun ajoute son op, le dernier ecrit ecrase le premier |
| **Correction** | Mutex async `withLock("offline:queue", ...)` dans `idb.ts` enveloppant `enqueue`, `dequeue`, `updateOperation` |
| **Fichiers** | `idb.ts:52-64`, `offline-queue.ts:55,82,97` |
| **Tests** | `sync-integration.test.ts` : "concurrent enqueue operations do not lose data", "concurrent enqueue and dequeue do not corrupt queue" |
| **Statut** | **CORRIGE + TESTE** |

---

### BUG 2 - Echec partiel d'ecriture cache (non-atomique)
| | |
|---|---|
| **Severite** | HAUTE |
| **Impact** | Cache dans un etat incoherent (ex: deck retire de allLists mais pas ajoute a myLists) |
| **Cause racine** | Les fonctions `addList`, `removeList` etc. faisaient plusieurs `idbSet` sequentiels sans rollback |
| **Scenario** | `addList` ecrit `myLists` avec le nouveau deck, puis crashe avant d'ecrire `allLists` -> deck present dans les deux |
| **Correction** | Pattern snapshot + try/catch + `restoreSnapshot()` dans `api-cache.ts` |
| **Fichiers** | `api-cache.ts:153-167` (restoreSnapshot), `api-cache.ts:194-215` (addList), etc. |
| **Tests** | `sync-integration.test.ts` : tests "Optimistic update with cache" |
| **Statut** | **CORRIGE + TESTE** |

---

### BUG 3 - Operations enfilees pendant un cycle de sync ignorees
| | |
|---|---|
| **Severite** | HAUTE |
| **Impact** | Nouvelles operations restent en queue indefiniment jusqu'au prochain trigger |
| **Cause racine** | `processQueue()` terminait apres le cycle sans reverifier la queue |
| **Scenario** | Pendant que sync traite [op1, op2], l'utilisateur ajoute op3 -> op3 ignoree |
| **Correction** | Apres `syncInProgress = false`, si `remaining.length > 0` sans echecs -> appel recursif `processQueue()` |
| **Fichiers** | `sync-manager.ts:254-264` |
| **Tests** | `sync-manager.test.ts` : "rechecks queue after sync if new ops were enqueued (BUG 3)" |
| **Statut** | **CORRIGE + TESTE** |

---

### BUG 4 - Reviews dupliquees dans la queue
| | |
|---|---|
| **Severite** | MOYENNE |
| **Impact** | Meme carte reviewee 2 fois envoyee au serveur, statistiques faussees |
| **Cause racine** | `queueReview()` faisait toujours `push()` sans verifier si une review existait deja pour le meme cardId |
| **Scenario** | Scenario upgrade AI : review classique puis re-evaluation IA de la meme carte -> 2 reviews en queue |
| **Correction** | Deduplication par `cardId` (findIndex + remplacement) + ajout `reviewId` pour idempotence serveur |
| **Fichiers** | `sync.ts:37-43`, `api.ts:78` (type Review + reviewId) |
| **Tests** | `sync-integration.test.ts` : "replaces existing review for same card (AI upgrade)" |
| **Statut** | **CORRIGE + TESTE** (client). Serveur : voir Bug Supplementaire #2 |

---

### BUG 5 - Rollback stale (UI pas mise a jour apres rollback)
| | |
|---|---|
| **Severite** | HAUTE |
| **Impact** | Cache IDB restaure mais UI affiche toujours l'etat optimiste |
| **Cause racine** | `rollbackOperation()` restaurait le cache mais rien ne notifiait l'UI |
| **Scenario** | ADD_LIST echoue apres 5 retries -> cache rollback -> UI montre encore la liste ajoutee |
| **Correction** | Dispatch `sync-rollback` CustomEvent + listener dans `useSyncStatus.ts` qui appelle `refreshCache()` |
| **Fichiers** | `sync-manager.ts:137-141`, `useSyncStatus.ts:97-105` |
| **Tests** | `sync-manager.test.ts` : "dispatches sync-rollback event on rollback (BUG 5)" |
| **Statut** | **CORRIGE + TESTE** |

---

### BUG 6 - 401 auth-expired traite comme erreur temporaire (retry inutile)
| | |
|---|---|
| **Severite** | HAUTE |
| **Impact** | 5 retries inutiles avec token expire, delai de 31s avant echec final |
| **Cause racine** | `processOperation()` ne distinguait pas 401 des autres erreurs |
| **Scenario** | Token expire -> sync echoue -> 5 retries exponentiels -> toutes echouent pareil |
| **Correction** | Detection `"Session expir"` dans le message d'erreur -> return `"auth-expired"`, pas de retry, dispatch event |
| **Fichiers** | `sync-manager.ts:159-167` |
| **Tests** | `sync-manager.test.ts` : "detects 401 auth-expired and dispatches event (BUG 6)" |
| **Statut** | **CORRIGE + TESTE**. Note : l'event n'est ecoute nulle part dans l'UI (voir Bug Suppl. #1) |

---

### BUG 7 - Contamination cross-compte (donnees IDB persistantes apres logout)
| | |
|---|---|
| **Severite** | CRITIQUE |
| **Impact** | User B voit les listes/operations/reviews de User A |
| **Cause racine** | `logout()` ne nettoyait que le token, pas les donnees IDB |
| **Scenario** | User A se deconnecte, User B se connecte -> IDB contient encore les caches et la queue de A |
| **Correction** | `logout()` dans `AuthContext.tsx` appelle `clearQueue()` + `clearCache()` + `clearReviewQueue()` |
| **Fichiers** | `AuthContext.tsx:98-108` |
| **Tests** | `sync-integration.test.ts` : "clears all IDB data on logout" |
| **Statut** | **CORRIGE + TESTE** |

---

### BUG 8 - Operations orphelines en etat "syncing" au redemarrage
| | |
|---|---|
| **Severite** | HAUTE |
| **Impact** | Operations bloquees definitivement, jamais retraitees |
| **Cause racine** | Si l'app crashe/ferme pendant un sync, les ops en "syncing" ne repassent jamais en "pending" |
| **Scenario** | Fermeture navigateur pendant sync -> reouverture -> ops en "syncing" ignorees par `getOperationsToSync()` |
| **Correction** | `resetSyncingOperations()` appele dans `initSyncManager()` au demarrage |
| **Fichiers** | `offline-queue.ts:142-158`, `sync-manager.ts:312-315` |
| **Tests** | `sync-manager.test.ts` : "resets orphaned syncing operations on startup (BUG 8)" |
| **Statut** | **CORRIGE + TESTE** |

---

### BUG 9 - Aucune notification utilisateur en cas d'echec permanent
| | |
|---|---|
| **Severite** | MOYENNE |
| **Impact** | Operation perdue silencieusement apres 5 retries, utilisateur ne sait pas |
| **Cause racine** | Pas d'event/callback apres rollback d'une operation ayant atteint le max de retries |
| **Scenario** | ADD_LIST echoue 5 fois -> rollback + dequeue -> utilisateur ne voit rien |
| **Correction** | Dispatch `sync-operation-failed` CustomEvent avec `operationType`, `operationId`, `lastError` |
| **Fichiers** | `sync-manager.ts:192-200` |
| **Tests** | `sync-manager.test.ts` : "dispatches sync-operation-failed event on max retries (BUG 9)" |
| **Statut** | **CORRIGE + TESTE**. Note : aucun composant n'ecoute cet event (voir Bug Suppl. #4) |

---

### BUG 10 - 404 sur DELETE_DECK gaspille des retries
| | |
|---|---|
| **Severite** | BASSE |
| **Impact** | 5 retries inutiles pour supprimer une ressource deja supprimee |
| **Cause racine** | DELETE_DECK traite le 404 comme une erreur standard |
| **Scenario** | Deck supprime sur un autre device -> sync DELETE echoue en 404 -> 5 retries -> rollback (restaure un deck qui n'existe plus) |
| **Correction** | Si `operation.type === "DELETE_DECK"` et erreur contient "introuvable" -> traite comme succes, dequeue |
| **Fichiers** | `sync-manager.ts:170-174` |
| **Tests** | `sync-manager.test.ts` : "treats 404 on DELETE_DECK as success (BUG 10)" |
| **Statut** | **CORRIGE + TESTE** |

---

## Verification du traitement

| Bug | Code Fix | Test Unit | Test Integration | Event UI | Complet ? |
|-----|----------|-----------|------------------|----------|-----------|
| BUG 1 - Race condition | withLock | - | 3 tests | - | **OUI** |
| BUG 2 - Echec partiel | restoreSnapshot | - | 4 tests | - | **OUI** |
| BUG 3 - Ops manquees | recursion processQueue | 1 test | - | - | **OUI** |
| BUG 4 - Review dupliquee | dedup cardId | - | 2 tests | - | **PARTIEL** (client OK, serveur non) |
| BUG 5 - Stale rollback | sync-rollback event | 1 test | - | refreshCache | **OUI** |
| BUG 6 - 401 retry | auth-expired detection | 1 test | - | event dispatch | **PARTIEL** (event non ecoute) |
| BUG 7 - Cross-compte | clear IDB on logout | - | 1 test | - | **OUI** |
| BUG 8 - Ops orphelines | resetSyncingOperations | 3 tests | - | - | **OUI** |
| BUG 9 - Pas de notif | sync-operation-failed | 1 test | - | event dispatch | **PARTIEL** (event non ecoute) |
| BUG 10 - 404 DELETE | traite comme succes | 2 tests | - | - | **OUI** |

**7/10 completement resolus, 3/10 partiellement (events dispatches mais non ecoutes dans l'UI)**

---

## Bugs supplementaires identifies (audit)

### Bug Suppl. #1 - CRITIQUE : Event `auth-expired` non ecoute dans l'UI

**Fichier concerne** : `AuthContext.tsx` (aucun listener)

Le sync-manager dispatch `auth-expired` quand un 401 est detecte pendant le sync, mais aucun composant React n'ecoute cet event. Resultat : l'utilisateur reste sur l'app avec un token expire, les operations echouent silencieusement.

**Action requise** : Ajouter un listener dans `AuthProvider` qui appelle `logout()` et redirige vers `/login`.

---

### Bug Suppl. #2 - CRITIQUE : Pas d'idempotence sur `POST /api/sync/push`

**Fichier** : `apps/api/app/api/sync/push/route.ts`

Le serveur fait un `prisma.review.createMany()` sans verifier les doublons. Si une requete de sync est retentee (timeout reseau), les memes reviews sont inserees une deuxieme fois. Le `reviewId` genere cote client n'est pas utilise cote serveur.

**Schema Prisma** : Le modele `Review` n'a aucune contrainte d'unicite sur `(userId, reviewId)`.

**Action requise** :
1. Ajouter champ `reviewId` au schema Prisma avec `@unique`
2. Utiliser `createMany({ skipDuplicates: true })` ou upsert par `reviewId`

---

### Bug Suppl. #3 - HAUTE : Race condition sur `PUT /api/my-lists/reorder`

**Fichier** : `apps/api/app/api/my-lists/reorder/route.ts`

Les mises a jour de position sont faites avec `Promise.all(updatePromises)` sans transaction Prisma. Deux requetes de reorder concurrentes peuvent produire un etat final incoherent.

**Action requise** : Wrapper dans `prisma.$transaction()`.

---

### Bug Suppl. #4 - MOYENNE : Event `sync-operation-failed` non ecoute

**Fichier concerne** : `useSyncStatus.ts` (aucun listener)

Meme probleme que le Bug Suppl. #1 mais pour les echecs permanents. L'utilisateur ne sait pas qu'une operation a ete annulee apres 5 retries.

**Action requise** : Ajouter listener dans `useSyncStatus.ts`, exposer un etat `lastFailedOperation` pour afficher un toast/banniere.

---

### Bug Suppl. #5 - MOYENNE : `.catch()` avale toutes les erreurs sur `POST /api/my-lists`

**Fichier** : `apps/api/app/api/my-lists/route.ts:49-53`

```javascript
await prisma.userDeck.create({ ... }).catch(() => {});
```

Le `.catch()` silencieux masque les erreurs de connexion DB, pas seulement les doublons.

**Action requise** : Verifier `err.code === 'P2002'` avant d'ignorer.

---

### Bug Suppl. #6 - MOYENNE : Cache Service Worker non isole par utilisateur

**Fichier** : `apps/web/public/sw.js`

Le Service Worker cache les reponses API (listes, cartes) dans un cache partage. Apres logout, le `clearCache()` vide l'IDB mais PAS le cache SW. Un second utilisateur sur le meme device pourrait voir des donnees en cache de l'utilisateur precedent s'il est offline.

**Action requise** : Envoyer un message au SW lors du logout pour vider `caches.delete(CACHE_NAME)`.

---

## Failles de securite

### SEC-1 : Token JWT dans localStorage (risque XSS)

**Fichier** : `auth.ts:21`

Le token d'authentification est stocke dans `localStorage`, accessible par tout script JavaScript. Si une faille XSS est exploitee (meme via une dependance tierce), le token peut etre vole.

**Etat actuel** : React echappe le contenu par defaut, pas de `dangerouslySetInnerHTML` sur du contenu utilisateur. Risque faible mais present.

**Mitigation possible** : httpOnly cookie pour le token (necessite changement backend).

---

### SEC-2 : Cookie `has_token` max-age 30j vs JWT expiry 7j

**Fichiers** : `auth.ts:26` (30 jours), backend `JWT_EXPIRES_IN="7d"`

Le cookie `has_token` reste 30 jours mais le JWT expire en 7 jours. Pendant 23 jours, le middleware croit que l'utilisateur est authentifie et ne redirige pas vers `/login`. Les requetes API echouent en 401 silencieusement.

**Action requise** : Aligner `max-age` du cookie sur la duree du JWT (7 jours).

---

### SEC-3 : Pas de validation d'acces sur `POST /api/my-lists` (abonnement a un deck)

**Fichier** : `apps/api/app/api/my-lists/route.ts:44-47`

Un utilisateur peut s'abonner a n'importe quel deck par son ID, y compris des decks prives d'autres utilisateurs. Il suffit de connaitre l'ID du deck.

**Note** : Si tous les decks sont publics par design, ce n'est pas un bug. Mais si des decks prives sont prevus (hierarchie parent/sous-listes), une verification d'acces sera necessaire.

---

## Ameliorations recommandees

### Priorite 1 (a faire maintenant)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Listener `auth-expired` dans AuthProvider -> logout + redirect | 15 min | Critique |
| 2 | Listener `sync-operation-failed` dans useSyncStatus -> toast erreur | 15 min | Moyenne |
| 3 | Aligner cookie max-age sur JWT expiry (7j) | 5 min | Securite |
| 4 | Transaction Prisma sur reorder | 10 min | Haute |

### Priorite 2 (sprint suivant)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 5 | Idempotence serveur avec `reviewId` (schema + upsert) | 30 min | Critique |
| 6 | Verification `P2002` au lieu de `.catch(() => {})` | 10 min | Moyenne |
| 7 | Nettoyage cache SW au logout (message postMessage) | 20 min | Moyenne |
| 8 | Versioning/ETag sur les caches pour detecter les conflits | 2h | Haute |

### Priorite 3 (ameliorations futures)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 9 | Migration token vers httpOnly cookie | 4h | Securite |
| 10 | Validation exp JWT cote client avant requete | 30 min | Performance |
| 11 | Conflict resolution (merge) au lieu de last-write-wins | 8h | Haute |
| 12 | Queue de reviews avec retry/backoff (comme les ops listes) | 2h | Fiabilite |
| 13 | Monitoring/alerting sur les echecs de sync en production | 4h | Observabilite |

---

## Fichiers modifies

### Code source (8 fichiers)

| Fichier | Modifications |
|---------|---------------|
| `apps/web/src/lib/idb.ts` | Ajout `withLock()` mutex async |
| `apps/web/src/lib/offline-queue.ts` | Wrapping mutex, `resetSyncingOperations()` |
| `apps/web/src/lib/sync.ts` | Mutex, dedup cardId, `clearReviewQueue()`, `reviewId` |
| `apps/web/src/lib/api.ts` | Ajout `reviewId` au type `Review` |
| `apps/web/src/lib/api-cache.ts` | `restoreSnapshot()`, try/catch atomique sur les 4 fonctions d'ecriture |
| `apps/web/src/lib/sync-manager.ts` | Rewrite complet - 6 bug fixes (BUG 3,5,6,8,9,10) |
| `apps/web/src/hooks/useSyncStatus.ts` | Listener `sync-rollback` -> `refreshCache()` |
| `apps/web/src/contexts/AuthContext.tsx` | Clear IDB au logout (BUG 7) |

### Tests (4 fichiers)

| Fichier | Contenu |
|---------|---------|
| `apps/web/src/__tests__/setup.ts` | Mock `withLock` avec vraie serialisation |
| `apps/web/src/__tests__/offline-queue.test.ts` | +3 tests `resetSyncingOperations` |
| `apps/web/src/__tests__/sync-manager.test.ts` | Rewrite complet ~25 tests |
| `apps/web/src/__tests__/sync-integration.test.ts` | Nouveau fichier ~21 tests integration |

### Resultats tests

```
Test Files  11 passed (11)
     Tests  211 passed (211)
  Duration  10.22s
```
