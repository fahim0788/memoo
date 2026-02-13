# 🧪 Guide de tests - MemoList MVP

## Table des matières

- [Environnement de test](#environnement-de-test)
- [Tests automatisés](#tests-automatisés)
- [Tests manuels](#tests-manuels)
- [Tests fonctionnels](#tests-fonctionnels)
- [Tests de régression](#tests-de-régression)
- [Résolution de problèmes](#résolution-de-problèmes)

---

## Environnement de test

### Services requis

Avant de commencer les tests, assurez-vous que tous les services sont opérationnels :

```bash
# 1. Base de données PostgreSQL (Docker)
docker ps | grep memolist-mvp-db
# ✅ Attendu: Container running sur port 5432

# 2. Backend API (Next.js)
cd apps/api
npm run dev
# ✅ Attendu: Serveur sur http://localhost:3001

# 3. Frontend (Next.js)
cd apps/web
npm run dev
# ✅ Attendu: Serveur sur http://localhost:3000
```

### Vérification rapide

```bash
# Test health endpoint
curl http://localhost:3001/api/health
# ✅ Attendu: {"ok":true,"time":...}

# Test frontend
curl -I http://localhost:3000
# ✅ Attendu: HTTP/1.1 200 OK
```

---

## Tests automatisés

### 1. Tests API Backend

#### Test de santé
```bash
curl -s http://localhost:3001/api/health | jq
```
**Résultat attendu:**
```json
{
  "ok": true,
  "time": 1770029628000
}
```

#### Test d'authentification - Inscription
```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "firstName": "Test",
    "lastName": "User"
  }' | jq
```
**Résultat attendu:**
```json
{
  "ok": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

#### Test d'authentification - Connexion
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }' | jq
```

#### Test avec authentification
```bash
# Récupérer le profil utilisateur
TOKEN="your-jwt-token-here"
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

#### Test des listes
```bash
# Lister toutes les listes disponibles
curl -s http://localhost:3001/api/lists \
  -H "Authorization: Bearer $TOKEN" | jq

# Lister mes listes
curl -s http://localhost:3001/api/my-lists \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 2. Tests de la base de données

```bash
# Se connecter à PostgreSQL
docker exec memolist-mvp-db-1 psql -U memolist -d memolist

# Vérifier les utilisateurs
SELECT email, "firstName", "lastName", "isActive" FROM "User";

# Vérifier les decks
SELECT name, (SELECT COUNT(*) FROM "Card" WHERE "deckId" = "Deck".id) as card_count FROM "Deck";

# Vérifier les reviews
SELECT COUNT(*) as total_reviews FROM "Review";
```

---

## Tests manuels

### 1. Test de base de l'application web

#### 1.1 Accès à l'application (non authentifié)
1. Ouvrir Chrome/Firefox (session vierge ou navigation privée)
2. Accéder à `http://localhost:3000`
3. ✅ **Attendu**: Redirection immédiate vers `/login` (middleware server-side, pas de flash "Chargement...")

#### 1.2 Accès à une URL invalide
1. Accéder à `http://localhost:3000/page-inexistante`
2. ✅ **Attendu**: Page 404 avec message "Ressource non trouvée" et bouton retour

#### 1.3 Inscription
1. Cliquer sur "S'inscrire" ou basculer vers le mode inscription
2. Remplir les champs :
   - Email: `test@memolist.com`
   - Mot de passe: `Test1234`
   - Prénom: `Test`
   - Nom: `User`
3. Cliquer sur "S'inscrire"
4. ✅ **Attendu**: Redirection vers la page principale

#### 1.4 Connexion
1. Se déconnecter
2. Se reconnecter avec les identifiants créés
3. ✅ **Attendu**: Accès à la page principale avec les listes

#### 1.5 Accès à /login quand déjà connecté
1. Être connecté sur la page principale
2. Taper manuellement `http://localhost:3000/login` dans la barre d'adresse
3. ✅ **Attendu**: Redirection immédiate vers `/` (middleware + garde client-side)

---

### 2. Tests du Service Worker et Cache Offline

#### 2.1 Vérification du Service Worker

1. **Ouvrir Chrome DevTools** (F12)
2. **Aller dans l'onglet Application**
3. **Dans le menu de gauche** → Service Workers
4. ✅ **Attendu**:
   - Service worker enregistré pour `http://localhost:3000`
   - Status: "activated and is running"
   - Source: `/sw.js`

#### 2.2 Vérification du cache

1. **DevTools → Application → Cache Storage**
2. **Ouvrir** `memolist-v2`
3. ✅ **Attendu**:
   - `/` (page principale)
   - `/manifest.webmanifest`
   - Assets JS/CSS (ajoutés dynamiquement)

#### 2.3 Test de chargement offline

1. **Avec l'application chargée**:
   - DevTools → Network → Cocher **"Offline"**
2. **Rafraîchir la page** (F5)
3. ✅ **Attendu**: L'application se charge depuis le cache
4. ✅ **Console logs**:
   ```
   [SW] Service worker activated
   [Cache] Using cached...
   ```

---

### 3. Tests de Cache Local (IndexedDB)

#### 3.1 Vérification d'IndexedDB

1. **DevTools → Application → IndexedDB**
2. **Ouvrir** `memolist_mvp`
3. ✅ **Attendu**: Base de données avec store `kv`

#### 3.2 Test du cache des listes

1. **En ligne**: Naviguer dans l'application, ajouter des listes
2. **Ouvrir la console** (F12 → Console)
3. ✅ **Observer les logs**:
   ```
   [Cache] Updated my lists cache
   [Cache] Updated all lists cache
   [Cache] Updated cards cache for deck xxx
   ```
4. **Passer offline**: Network → Offline
5. **Rafraîchir la page**
6. ✅ **Attendu**:
   - Les listes s'affichent
   - Console: `[Cache] Using cached my lists`

#### 3.3 Inspection manuelle du cache

```javascript
// Dans la console Chrome
// Vérifier le cache des listes
async function checkCache() {
  const db = await window.indexedDB.open('memolist_mvp');
  db.onsuccess = (e) => {
    const tx = e.target.result.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');

    store.get('cache:my-lists').onsuccess = (e) => {
      console.log('My Lists Cache:', e.target.result);
    };
  };
}
checkCache();
```

---

### 4. Tests de Synchronisation Automatique

#### 4.1 Test de synchronisation en ligne

1. **Être connecté en ligne**
2. **Ouvrir une liste et étudier**
3. **Répondre à 2-3 questions**
4. ✅ **Observer la console**:
   ```
   [Sync] 3 reviews synchronisées
   ```
5. ✅ **Vérifier dans la BDD**:
   ```sql
   SELECT COUNT(*) FROM "Review" WHERE "userId" = 'your-user-id';
   ```

#### 4.2 Test de synchronisation offline

1. **Passer offline**: DevTools → Network → Offline
2. **Répondre à 2-3 questions**
3. ✅ **Attendu**:
   - Badge en bas à droite: "🔄 3 révisions en attente"
4. ✅ **Observer la console**:
   ```
   [Sync] Échec, les reviews restent en queue
   ```
5. **Vérifier IndexedDB**: `sync_queue` doit contenir les reviews

#### 4.3 Test de synchronisation automatique au retour en ligne

1. **Étant offline avec des reviews en attente**
2. **Ouvrir la console pour observer**
3. **Repasser en ligne**: Network → Décocher "Offline"
4. ✅ **Attendu**:
   - Badge devient: "✅ 3 révisions synchronisées"
   - Le badge disparaît après 3 secondes
5. ✅ **Logs console**:
   ```
   [PWA] Connection restored - triggering sync
   [Sync] 3 reviews synchronisées
   [PWA] Successfully synced 3 reviews
   ```
6. ✅ **Vérifier IndexedDB**: `sync_queue` doit être vide

---

### 5. Tests des Composants Refactorisés

#### 5.1 MenuView (Page d'accueil)

**Tests visuels:**
- ✅ Affichage du titre "Memoo"
- ✅ Bouton "Déconnexion" visible
- ✅ Liste des decks de l'utilisateur
- ✅ Bouton "✕" pour supprimer une liste
- ✅ Bouton "Explorer les listes disponibles"
- ✅ Message si aucune liste

**Tests fonctionnels:**
1. Cliquer sur une liste → Ouvre StudyView
2. Cliquer sur "Explorer" → Ouvre AvailableView
3. Cliquer sur "✕" → Supprime la liste
4. Cliquer sur "Déconnexion" → Redirige vers /login

#### 5.2 AvailableView (Exploration de listes)

**Tests visuels:**
- ✅ Titre "Listes disponibles"
- ✅ Bouton "← Retour"
- ✅ Liste des decks non encore ajoutés
- ✅ Bouton "Ajouter" pour chaque deck

**Tests fonctionnels:**
1. Cliquer sur "Ajouter" → Ajoute la liste
2. Vérifier que la liste disparaît de la vue
3. Retour au menu → Liste apparaît dans "Mes listes"

#### 5.3 StudyView (Interface d'étude)

**Tests visuels:**
- ✅ Nom du deck affiché
- ✅ Compteur "Aujourd'hui: X"
- ✅ Question affichée
- ✅ Champ de saisie pour la réponse
- ✅ Boutons "Valider" et "Voir la réponse"

**Tests fonctionnels:**
1. **Réponse correcte**:
   - Entrer une bonne réponse
   - Cliquer "Valider"
   - ✅ Badge "✅ Correct"
   - ✅ Compteur incrémenté
   - Cliquer "Suivant" → Nouvelle question

2. **Réponse incorrecte**:
   - Entrer une mauvaise réponse
   - Cliquer "Valider"
   - ✅ Badge "❌ Incorrect"
   - ✅ Réponse de référence affichée

3. **Voir la réponse**:
   - Cliquer "Voir la réponse" sans répondre
   - ✅ Réponse affichée
   - ✅ Compteur incrémenté

4. **Fin des cartes**:
   - Étudier toutes les cartes dues
   - ✅ Message "🎉 Terminé"

#### 5.4 SyncStatus (Indicateur de sync)

**États testés:**

1. **Offline sans reviews en attente**:
   - ✅ Badge: "📡 Hors ligne" (orange)

2. **Reviews en attente**:
   - ✅ Badge: "🔄 X révisions en attente" (bleu)

3. **Sync réussie**:
   - ✅ Badge: "✅ X révisions synchronisées" (vert)
   - ✅ Disparaît après 3 secondes

4. **En ligne sans reviews**:
   - ✅ Pas de badge affiché

---

### 6. Tests des Hooks Custom

#### 6.1 useLists

**Test en console:**
```javascript
// Dans React DevTools Components
// Sélectionner le composant HomePage
// Observer les props:
// - myLists: DeckFromApi[]
// - allLists: DeckFromApi[]
// - loading: boolean
// - error: string | null
```

**Scénarios:**
1. ✅ Chargement initial: `loading = true`
2. ✅ Données chargées: `myLists` et `allLists` remplis
3. ✅ Erreur réseau: `error` contient le message
4. ✅ Ajout de liste: `myLists` mis à jour
5. ✅ Suppression de liste: `myLists` mis à jour

#### 6.2 useSyncStatus

**Test en console:**
```javascript
// Observer l'état en temps réel
const status = {
  isOnline: navigator.onLine,
  pendingCount: 0,
  lastSyncCount: null
};
```

**Scénarios:**
1. ✅ Passage offline: `isOnline = false`
2. ✅ Passage online: `isOnline = true`
3. ✅ Reviews en attente: `pendingCount > 0`
4. ✅ Après sync: `lastSyncCount = X`, puis `null` après 3s

---

## Tests fonctionnels

### Parcours utilisateur complet (User Journey)

#### Scénario 1: Nouvel utilisateur

1. **Inscription**
   - [ ] Créer un compte
   - [ ] Redirection vers la page principale
   - [ ] Message de bienvenue affiché

2. **Découverte**
   - [ ] Cliquer sur "Explorer les listes"
   - [ ] Voir toutes les listes disponibles
   - [ ] Ajouter 2-3 listes

3. **Apprentissage**
   - [ ] Sélectionner une liste
   - [ ] Étudier 10 cartes
   - [ ] Vérifier le compteur "Aujourd'hui"

4. **Déconnexion/Reconnexion**
   - [ ] Se déconnecter
   - [ ] Se reconnecter
   - [ ] Vérifier que les listes sont toujours présentes

#### Scénario 2: Utilisation offline

1. **Préparation en ligne**
   - [ ] Se connecter
   - [ ] Ajouter 2 listes
   - [ ] Étudier quelques cartes de chaque liste

2. **Passage offline**
   - [ ] Passer offline (DevTools Network)
   - [ ] Rafraîchir la page → L'app se charge
   - [ ] Naviguer entre les listes → Fonctionne

3. **Étude offline**
   - [ ] Étudier 5 cartes
   - [ ] Vérifier le badge "X révisions en attente"

4. **Retour en ligne**
   - [ ] Repasser online
   - [ ] Observer la sync automatique
   - [ ] Vérifier le badge "✅ synchronisées"
   - [ ] Vérifier dans la BDD que les reviews sont présentes

#### Scénario 3: Gestion d'erreur

1. **Erreur réseau**
   - [ ] Arrêter le backend API
   - [ ] Essayer d'ajouter une liste
   - [ ] ✅ Message d'erreur affiché
   - [ ] Relancer l'API
   - [ ] Réessayer → Fonctionne

2. **Session expirée**
   - [ ] Modifier le token dans localStorage
   - [ ] Rafraîchir la page
   - [ ] ✅ Redirection vers /login

3. **Protection middleware (server-side)**
   - [ ] Supprimer le cookie `has_token` (DevTools → Application → Cookies)
   - [ ] Rafraîchir la page
   - [ ] ✅ Redirection immédiate vers /login sans flash de chargement

4. **Page 404**
   - [ ] Accéder à une URL inexistante (`/xyz`)
   - [ ] ✅ Page 404 affichée avec bouton retour
   - [ ] Cliquer sur "Retour" → Redirection vers `/`

---

## Tests de régression

### Checklist de non-régression

Après chaque modification, vérifier que :

- [ ] L'authentification fonctionne toujours
- [ ] Le middleware redirige les non-authentifiés vers /login
- [ ] Le middleware redirige /login vers / si déjà connecté
- [ ] La page 404 s'affiche pour les URLs invalides
- [ ] Les listes se chargent correctement
- [ ] L'étude de cartes fonctionne
- [ ] Le système de répétition espacée calcule correctement
- [ ] Les reviews sont enregistrées en BDD
- [ ] La synchronisation offline fonctionne
- [ ] Le Service Worker s'active correctement
- [ ] Le cache IndexedDB fonctionne
- [ ] Les compteurs de cartes sont corrects
- [ ] La déconnexion fonctionne

---

## Résolution de problèmes

### Problème: Service Worker ne s'enregistre pas

**Symptôme**: Pas de SW dans DevTools → Application → Service Workers

**Solutions**:
1. Vérifier que vous êtes en production (`npm run build && npm start`)
2. En dev, le SW ne s'enregistre que si `NODE_ENV=production`
3. Vérifier dans la console : erreurs d'enregistrement du SW

### Problème: Cache ne fonctionne pas offline

**Symptôme**: Erreur de chargement offline

**Solutions**:
1. Vider le cache : DevTools → Application → Clear storage
2. Désenregistrer le SW et recharger
3. Vérifier que `CACHE_NAME = "memolist-v2"` dans sw.js
4. Vérifier les logs console pour les erreurs de cache

### Problème: Synchronisation ne se déclenche pas

**Symptôme**: Les reviews restent en attente même en ligne

**Solutions**:
1. Vérifier la console pour les erreurs
2. Vérifier que l'API backend tourne sur le port 3001
3. Vérifier le token JWT (doit être valide)
4. Forcer une sync manuellement :
   ```javascript
   import { flushQueue } from './lib/sync';
   await flushQueue();
   ```

### Problème: IndexedDB n'enregistre pas

**Symptôme**: Données perdues après rafraîchissement

**Solutions**:
1. Vérifier que le navigateur supporte IndexedDB
2. Essayer en navigation privée
3. Vérifier les quotas de stockage du navigateur
4. Inspecter IndexedDB dans DevTools pour voir les erreurs

### Problème: API retourne 401 Unauthorized

**Symptôme**: Toutes les requêtes API échouent avec 401

**Solutions**:
1. Vérifier que le token est présent dans localStorage
2. Vérifier la validité du token (expiration 7 jours)
3. Se reconnecter pour obtenir un nouveau token
4. Vérifier que `Authorization: Bearer TOKEN` est bien envoyé

### Problème: Reviews dupliquées

**Symptôme**: Les mêmes reviews apparaissent plusieurs fois en BDD

**Solutions**:
1. Vider la queue de sync : `localStorage.removeItem('sync_queue')`
2. Vérifier que `flushQueue()` vide bien la queue après succès
3. Vérifier les logs de synchronisation dans la console

---

## Scripts utiles

### Script de test complet

```bash
#!/bin/bash
# test-all.sh

echo "🧪 MemoList - Tests automatisés"
echo "================================"

# 1. Vérifier les services
echo "1️⃣ Vérification des services..."
curl -s http://localhost:3001/api/health > /dev/null && echo "✅ API OK" || echo "❌ API KO"
curl -s -I http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend KO"
docker ps | grep memolist-mvp-db > /dev/null && echo "✅ DB OK" || echo "❌ DB KO"

# 2. Créer un utilisateur de test
echo ""
echo "2️⃣ Création d'un utilisateur de test..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"autotest@memolist.com","password":"Test1234","firstName":"Auto","lastName":"Test"}')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token: ${TOKEN:0:20}..."

# 3. Tester les endpoints
echo ""
echo "3️⃣ Tests des endpoints..."
curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN" > /dev/null && echo "✅ GET /auth/me" || echo "❌ GET /auth/me"
curl -s http://localhost:3001/api/lists -H "Authorization: Bearer $TOKEN" > /dev/null && echo "✅ GET /lists" || echo "❌ GET /lists"
curl -s http://localhost:3001/api/my-lists -H "Authorization: Bearer $TOKEN" > /dev/null && echo "✅ GET /my-lists" || echo "❌ GET /my-lists"

echo ""
echo "✅ Tests terminés !"
```

### Script de nettoyage BDD

```sql
-- cleanup.sql
-- Nettoyer les données de test

DELETE FROM "Review" WHERE "userId" IN (
  SELECT id FROM "User" WHERE email LIKE '%test%'
);

DELETE FROM "UserDeck" WHERE "userId" IN (
  SELECT id FROM "User" WHERE email LIKE '%test%'
);

DELETE FROM "User" WHERE email LIKE '%test%';
```

---

## Métriques de performance

### Temps de chargement cibles

| Métrique | Cible | Moyen |
|----------|-------|-------|
| First Contentful Paint (FCP) | < 1.5s | 1.2s |
| Largest Contentful Paint (LCP) | < 2.5s | 2.0s |
| Time to Interactive (TTI) | < 3.5s | 3.0s |
| Service Worker activation | < 1s | 0.5s |
| Sync queue flush | < 2s | 1.5s |

### Métriques de cache

| Métrique | Cible |
|----------|-------|
| Cache hit rate (offline) | > 95% |
| IndexedDB write time | < 100ms |
| IndexedDB read time | < 50ms |

---

## Conclusion

Ce guide de tests couvre tous les aspects de l'application MemoList MVP après refactorisation. Utilisez-le comme checklist avant chaque déploiement pour garantir la qualité et la stabilité de l'application.

Pour toute question ou amélioration de ce guide, ouvrez une issue sur GitHub.

---

**Dernière mise à jour**: 2026-02-13
**Version de l'application**: 1.0.0 (refactorisée)
**Auteur**: Équipe MemoList
