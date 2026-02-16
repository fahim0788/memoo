# Strategie d'evaluation IA des reponses

## Probleme

Lors de la revision, un utilisateur peut taper une reponse **semantiquement correcte mais formulee differemment** de la reponse de reference. Exemples :

| Question | Reference | Reponse utilisateur | Resultat sans IA |
|---|---|---|---|
| Capitale de la France ? | Paris | La ville de Paris | ❌ incorrect |
| Photosynthesis in French? | photosynthese | la photosynthese | ❌ incorrect |
| What is H2O? | water | eau | ❌ incorrect |
| 1+1? | 2 | deux | ❌ incorrect |

Le matching textuel (`normalizeText` + mots-cles) ne couvre pas les synonymes, reformulations, ou traductions.

**Cependant**, l'evaluation IA n'est pas pertinente pour tous les types de cartes. Pour les reponses factuelles courtes (drapeaux, capitales), les mauvaises reponses sont infiniment diverses et ne convergent jamais — chaque erreur genere un appel IA inutile (l'IA dira "NON" a chaque fois). Un flag `aiVerify` permet de desactiver l'evaluation IA pour ces decks.

---

## Flag `aiVerify` — controle par deck et par carte

### Principe

Le flag `aiVerify` controle si l'evaluation IA est activee. Il fonctionne avec un systeme d'heritage :

```
Card.aiVerify ?? Deck.aiVerify ?? true
```

- **Deck.aiVerify** : `Boolean @default(true)` — active par defaut pour tous les decks
- **Card.aiVerify** : `Boolean?` (nullable) — `null` = herite du deck, `true`/`false` = override

### Quand desactiver ?

| Type de deck | `aiVerify` recommande | Raison |
|---|---|---|
| Phrases / traductions | `true` (defaut) | Reformulations valides, convergence forte |
| Vocabulaire bilingue | `true` (defaut) | Synonymes, variantes ortho |
| Drapeaux du monde | `false` | 1 seule bonne reponse, matching local suffit |
| Capitales / dates | `false` | Reponses factuelles courtes, pas d'ambiguite |
| Formules scientifiques | `false` | Notation exacte requise |

### Analyse economique

| Scenario | Avec aiVerify=true | Avec aiVerify=false |
|---|---|---|
| Bonne reponse | 0 appel (match local) | 0 appel (match local) |
| Bonne reformulation (1ere fois) | 1 appel → cache | ❌ marque incorrect |
| Bonne reformulation (fois suivantes) | 0 appel (cache) | ❌ marque incorrect |
| Mauvaise reponse | 1 appel → NON (jamais cache) | 0 appel → ❌ immediat |

**Pour les phrases** : les bonnes reformulations convergent vite (5-10 variantes), le cout initial est amorti.

**Pour les drapeaux** : les mauvaises reponses sont infiniment diverses ("Irlande", "Hongrie", "Mexique"...), chaque erreur = 1 appel IA sans benefice de cache. Desactiver `aiVerify` economise 100% de ces appels.

### API

**Creer un deck sans verification IA :**
```json
POST /api/my-decks
{
  "name": "Drapeaux du monde",
  "aiVerify": false,
  "cards": [...]
}
```

**Modifier un deck existant :**
```json
PUT /api/my-decks/{deckId}
{
  "name": "Drapeaux du monde",
  "aiVerify": false
}
```

**Override par carte (optionnel) :**
```json
PUT /api/my-decks/{deckId}/cards/{cardId}
{
  "question": "Traduire : How are you?",
  "answers": ["Comment allez-vous"],
  "aiVerify": true
}
```

---

## Solution : evaluation IA avec cache auto-alimenté

### Principe

Quand le matching local echoue, on demande a une IA (GPT-4o-mini) si la reponse est acceptable. Si oui, on **persiste cette reponse alternative** dans le tableau `Card.answers` en base de donnees.

**Resultat** : la prochaine fois qu'un utilisateur donne la meme formulation, le matching local reussit directement — **zero appel API**.

```
Jour 1 : "la photosynthese" → pas de match → appel IA → OUI → sauvegarde
Jour 2 : "la photosynthese" → match local direct ✅ (0 appel IA)
Jour 3 : "photosynthesis"   → pas de match → appel IA → OUI → sauvegarde
Jour 4 : "photosynthesis"   → match local direct ✅ (0 appel IA)
```

Plus il y a d'utilisateurs, moins il y a d'appels API. Le systeme **s'entraine tout seul**.

---

## Architecture

### Flux complet

```
Reponse utilisateur
  │
  ├─ normalizeText() + match exact avec answers[] ?
  │   └─ OUI → ✅ correct (0 latence, 0 cout)
  │
  ├─ Match fuzzy (mots-cles sans articles) avec answers[] ?
  │   └─ OUI → ✅ correct (0 latence, 0 cout)
  │
  ├─ Mode != "text" ? (MCQ, YesNo, Number, Scramble)
  │   └─ OUI → ❌ incorrect (reponse definitive, pas d'ambiguite)
  │
  ├─ aiVerify desactive ? (card.aiVerify ?? deck.aiVerify === false)
  │   └─ OUI → ❌ incorrect (pas d'appel IA, economie de cout)
  │
  ├─ Hors ligne (navigator.onLine === false) ?
  │   └─ OUI → ❌ incorrect (pas d'appel reseau)
  │
  └─ Appel API : POST /api/cards/{cardId}/evaluate
      │
      ├─ IA dit OUI → ✅ correct
      │   ├─ Backend : INSERT reponse dans Card.answers (dedoublonne)
      │   └─ Frontend : push dans le cache local de la carte
      │
      ├─ IA dit NON → ❌ incorrect
      │
      └─ Erreur / Timeout (8s) → ❌ incorrect (fail safe)
```

### Pourquoi seulement le mode "text" ?

| Mode | Pourquoi pas d'IA |
|---|---|
| **YesNo** | 2 boutons (Oui/Non) — reponse binaire, aucune ambiguite |
| **NumberChoice** | 3 boutons numeriques — clic sur un nombre precis |
| **WordScramble** | Reconstruction mot par mot — la reponse est composee des mots exacts |
| **FillBlank** | Selection de mots dans un pool — la reponse est composee des mots exacts de la phrase |
| **MCQ** | 4 boutons — l'utilisateur choisit parmi des options fixes |
| **TextInput** | Saisie libre → seul mode ou la formulation peut varier ✅ |

### Pourquoi pas en mode hors ligne ?

- L'evaluation IA necessite un appel reseau au backend puis a OpenAI
- En offline, on se contente du matching local (reference + reponses deja cachees)
- Les reponses alternatives deja enregistrees par d'autres utilisateurs sont disponibles localement (chargees au fetch initial du deck)

---

## Fichiers impliques

### Backend

**`apps/api/app/api/cards/[cardId]/evaluate/route.ts`**

Route API `POST` :
- **Auth** : Bearer token obligatoire (`requireAuth`)
- **Input** : `{ userAnswer: string, question: string, referenceAnswers: string[] }`
- **Guard aiVerify** : verifie `card.aiVerify ?? deck.aiVerify` avant tout appel OpenAI. Si `false`, retourne `{ acceptable: false, skipped: true }` immediatement
- **Modele** : `gpt-4o-mini` (le plus economique d'OpenAI)
- **Temperature** : `0` (reponse deterministe, pas de creativite)
- **Max tokens** : `10` (juste "OUI" ou "NON")
- **Output** : `{ acceptable: boolean }` (+ `skipped: true` si aiVerify desactive)

**Prompt systeme** :
```
Tu es un correcteur de flashcards. On te donne une question, la ou les
reponse(s) de reference, et la reponse d'un utilisateur.
Reponds UNIQUEMENT "OUI" si la reponse utilisateur est correcte ou
acceptablement equivalente (synonyme, reformulation, variante orthographique,
pluriel/singulier, langue differente du meme mot).
Reponds "NON" si la reponse est incorrecte, trop vague, ou incomplete.
Ne donne aucune explication.
```

**Logique de persistance** (si OUI) :
1. Lire `Card.answers` actuel (JSON array)
2. Verifier que la reponse n'existe pas deja (comparaison lowercase)
3. Si nouvelle : `prisma.card.update({ answers: [...current, userAnswer.trim()] })`

### Frontend

**`apps/web/src/lib/api.ts`** — `evaluateAnswer()`
- Timeout 8s via `AbortController`
- Appel `POST /api/cards/{cardId}/evaluate`

**`apps/web/src/components/StudyView.tsx`** — `handleAnswer()`
- State `evaluating` pour afficher le spinner
- **Guard frontend** : `const shouldAiVerify = current.aiVerify ?? deck.aiVerify ?? true`
- Si `isCorrect()` echoue + `shouldAiVerify` + mode `text` + online → appel IA
- Si accepte : `current.answers.push()` pour le cache local de session

**`apps/web/src/components/AnswerInput.tsx`**
- Export du type `AnswerMode`
- Passe le mode detecte a `onAnswer(answer, mode)`

**`apps/web/src/lib/i18n.ts`**
- Cle `study.evaluating` : "Verification..." (FR) / "Checking..." (EN)

---

## Cout API

### Par appel

| Metrique | Valeur |
|---|---|
| Modele | gpt-4o-mini |
| Tokens input | ~100 (prompt + question + reponses) |
| Tokens output | ~2-3 ("OUI" ou "NON") |
| Cout input | $0.15 / 1M tokens |
| Cout output | $0.60 / 1M tokens |
| **Cout par evaluation** | **~$0.00002** (~0.002 centimes) |

### Projection

| Scenario | Appels/jour | Cout/jour | Cout/mois |
|---|---|---|---|
| 10 utilisateurs actifs | ~50 | $0.001 | $0.03 |
| 100 utilisateurs actifs | ~200 (J1) → ~50 (J30) | $0.004 → $0.001 | ~$0.05 |
| 1000 utilisateurs actifs | ~500 (J1) → ~100 (J30) | $0.01 → $0.002 | ~$0.15 |

**L'effet cache est exponentiel** : chaque reponse validee evite **tous** les futurs appels pour cette formulation, sur **toutes** les sessions de **tous** les utilisateurs.

---

## Propagation des reponses

### Comment une reponse acceptee atteint les autres utilisateurs ?

1. **Utilisateur A** tape "la photosynthese" → IA dit OUI → sauvegarde en DB dans `Card.answers`
2. **Utilisateur B** ouvre le meme deck → `fetchCards()` charge les cartes avec le `answers` mis a jour
3. **Utilisateur B** tape "la photosynthese" → `isCorrect()` → match direct ✅ (0 appel IA)

### Cache local (session en cours)

Quand l'IA valide une reponse, elle est aussi pushee dans `current.answers` cote client. Si l'utilisateur revise la meme carte plus tard dans la session, le match est immediat sans re-fetch.

---

## Securite et limites

### Protections en place

- **Auth obligatoire** : seuls les utilisateurs connectes peuvent appeler l'endpoint
- **Timeout 8s** : si l'IA ne repond pas, on passe a incorrect (pas de blocage UI)
- **Fail safe** : toute erreur (reseau, API, parsing) → resultat incorrect par defaut
- **Dedoublonnage** : une meme reponse n'est jamais inseree deux fois

### Limites connues

| Limite | Impact | Mitigation possible |
|---|---|---|
| Faux positif IA | Une mauvaise reponse est acceptee et persistee | Le createur du deck peut editer `Card.answers` |
| Pas de rate limiting | Un utilisateur pourrait spammer des evaluations | Ajouter un rate limit par userId (futur) |
| Pas de rollback | Impossible de distinguer reponses originales vs IA | Ajouter un champ `source` au JSON (futur) |
| Latence ~1-3s | Delai visible sur le mode texte uniquement | Indicateur "Verification..." affiche |
| Pas de cache negatif | Les mauvaises reponses generent toujours un appel IA | Desactiver `aiVerify` pour les decks factuels, ou ajouter un `rejectedAnswers[]` (futur) |

---

## Comportement par scenario

| Scenario | Resultat |
|---|---|
| Reponse exacte apres normalisation | ✅ immediat (local) |
| Mots-cles presents (sans articles) | ✅ immediat (local) |
| Reponse deja validee par IA precedemment | ✅ immediat (local, via `Card.answers` enrichi) |
| Reformulation correcte, premiere occurrence | ⏳ 1-3s → ✅ (appel IA + sauvegarde) |
| Reformulation incorrecte | ⏳ 1-3s → ❌ (appel IA, pas de sauvegarde) |
| Mode MCQ/YesNo/Number/Scramble/FillBlank, mauvaise reponse | ❌ immediat (pas d'appel IA) |
| Mode texte, hors ligne, mauvaise reponse | ❌ immediat (pas d'appel IA) |
| Mode texte, `aiVerify=false` (deck ou carte) | ❌ immediat (pas d'appel IA) |
| Erreur serveur ou timeout | ❌ immediat (fail safe) |

---

## Tests

### Manuels

1. **Happy path** : reviser une carte en mode texte → taper une reformulation correcte → verifier le spinner "Verification..." → verifier ✅ → re-reviser la meme carte avec la meme formulation → verifier ✅ immediat (pas de spinner)
2. **Rejet IA** : taper une reponse clairement fausse → verifier ❌ apres le spinner
3. **Offline** : couper le reseau → taper une reformulation → verifier ❌ immediat, pas de spinner
4. **Autres modes** : repondre faux en MCQ/YesNo → verifier ❌ immediat, pas de spinner
5. **Persistance** : apres un accept IA, verifier en DB que `Card.answers` contient la nouvelle entree
6. **aiVerify=false (deck)** : creer un deck avec `aiVerify: false` → reviser en mode texte → taper une reformulation → verifier ❌ immediat, pas de spinner, pas d'appel reseau
7. **aiVerify override (carte)** : dans un deck `aiVerify: false`, mettre une carte a `aiVerify: true` → verifier que l'IA est appelee pour cette carte uniquement

### Automatises

```bash
cd apps/web && npm test   # 172 tests, 0 regression
```

Les tests existants ne sont pas impactes car l'evaluation IA est un chemin additionnel (non-bloquant) au-dessus du matching local existant.
