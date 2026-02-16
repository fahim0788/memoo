# Modes de saisie intelligents - AnswerInput

## Vue d'ensemble

Le composant `AnswerInput` remplace la saisie texte unique par **6 modes de saisie** qui s'adaptent automatiquement au contenu de chaque carte. L'objectif est de réduire la friction, varier l'expérience et rendre la révision plus engageante.

Un systeme **`allowedModes`** (par deck avec override par carte) permet de restreindre les modes autorises selon le type de contenu (ex: pas de scramble/fillblank pour les decks d'examen civique).

**Fichier principal** : `apps/web/src/components/AnswerInput.tsx`
**Intégration** : `apps/web/src/components/StudyView.tsx`

---

## Les 5 modes

### 1. YesNo - Boutons Oui/Non

**Détection** : réponse attendue parmi `oui`, `non`, `yes`, `no`, `vrai`, `faux`, `true`, `false`
**Déclenchement** : 100% (toujours activé quand détecté)

**UX** :
- 2 gros boutons côte à côte
- Vert (Oui/Vrai) et rouge (Non/Faux)
- Clic = validation immédiate
- Les labels s'adaptent à la langue de la réponse (Oui/Non, Yes/No, Vrai/Faux, True/False)

**Intérêt pédagogique** : Élimine la saisie inutile pour les réponses binaires. L'utilisateur se concentre sur la réflexion, pas sur le clavier.

---

### 2. NumberChoice - Choix de nombres

**Détection** : réponse = nombre entier ou décimal (regex `^\d+([.,]\d+)?$`)
**Déclenchement** : 100% (toujours activé quand détecté)

**UX** :
- 3 boutons : le bon nombre + 2 leurres
- Leurres générés à ±30% du nombre correct (minimum ±2)
- Les entiers restent entiers, les décimaux restent décimaux
- Ordre mélangé de manière déterministe

**Algorithme des leurres** :
```
range = max(ceil(|nombre| * 0.3), 2)
leurre1 = nombre + (hash % range + 1)
leurre2 = nombre - (hash >> 4 % range + 1)
```

**Intérêt pédagogique** : Forcer la reconnaissance plutôt que le rappel exact d'un nombre est plus adapté aux premières révisions. Les leurres proches obligent à bien connaître la valeur.

---

### 3. WordScramble - Mots mélangés

**Détection** : réponse de 3 mots ou plus
**Déclenchement** : ~50% des cartes éligibles (varie par jour)

**UX** :
- Les mots de la réponse sont affichés en tant que "chips" dans un ordre aléatoire
- Zone de dépôt (rectangle en pointillés) en haut
- **Tap** : toucher un mot l'ajoute à la zone de réponse
- **Drag & drop** : glisser un mot vers la zone (desktop)
- **Retirer** : toucher un mot dans la zone de réponse le retire
- **Auto-validation** : quand tous les mots sont placés, validation automatique après 350ms
- Animation `chipIn` (scale + fade) quand un mot est placé

**Visuels** :
- Zone vide : bordure pointillée grise + placeholder "Touche les mots dans l'ordre..."
- Zone remplie : fond vert clair, bordure verte, chips blancs sur fond vert
- Mots disponibles : fond gris, bordure fine, cursor grab

**Intérêt pédagogique** : Reconstuire une phrase dans le bon ordre sollicite la mémoire de l'ordre syntaxique, pas seulement le vocabulaire. Plus ludique que la saisie texte.

---

### 4. MCQ - Choix multiples depuis le deck

**Détection** : générique (fonctionne pour toute carte si le deck contient 4+ cartes)
**Déclenchement** : ~20-40% selon la longueur de la réponse (varie par jour)

**UX** :
- 4 boutons empilés verticalement (1 correct + 3 distracteurs)
- Les distracteurs sont les réponses d'autres cartes du même deck
- Dédoublonnage automatique des distracteurs
- Ordre mélangé de manière déterministe
- Clic = validation immédiate

**Algorithme des distracteurs** :
1. Collecter toutes les `answers[0]` des autres cartes du deck
2. Exclure celles identiques (après normalisation) à la bonne réponse
3. Dédoublonner avec `Set`
4. Mélanger avec seed déterministe
5. Prendre les 3 premières

**Intérêt pédagogique** : Mode de reconnaissance (vs rappel). Utile pour les premières expositions. Les distracteurs provenant du même deck obligent à faire la distinction entre des concepts proches.

---

### 5. FillBlank - Texte à trous avec distracteurs IA

**Détection** : réponse de 3 mots ou plus
**Déclenchement** : ~20% des cartes éligibles (varie par jour)

**UX** :
- La réponse s'affiche avec N mots-clés remplacés par `___`
- Un pool de chips (mots corrects + distracteurs IA) est affiché en dessous, mélangés
- L'utilisateur tape les chips pour remplir les trous dans l'ordre
- Le trou actif est mis en évidence (bordure solid + couleur primary)
- Cliquer sur un trou déjà rempli retire le mot (permet de corriger)
- **Auto-validation** : quand tous les trous sont remplis, validation automatique après 350ms

**Nombre de trous (adaptatif selon la longueur)** :
| Longueur réponse | Nombre de trous |
|---|---|
| 3-5 mots | 1 trou |
| 6-10 mots | 2 trous |
| 11+ mots | 3 trous |

**Distracteurs IA** :
- Générés par GPT-4o-mini via `POST /api/cards/{cardId}/fill-blanks`
- 2 distracteurs par trou (même type grammatical, plausibles dans le contexte)
- **Cachés en DB** (`Card.fillBlanks`) : 1 appel IA par carte, à vie (comme les distracteurs MCQ)
- Fallback vers le mode scramble si offline ou si la génération échoue

**Structure DB** (`Card.fillBlanks`, JSON) :
```json
[
  { "index": 2, "word": "photosynthèse", "distractors": ["respiration", "fermentation"] },
  { "index": 5, "word": "chlorophylle", "distractors": ["mélanine", "kératine"] }
]
```

**Intérêt pédagogique** : Combine reconnaissance (comme MCQ) et contexte syntaxique (comme scramble). L'utilisateur doit identifier les mots-clés importants parmi des distracteurs plausibles, tout en gardant le contexte de la phrase.

---

### 6. TextInput - Saisie classique (fallback)

**Détection** : fallback quand aucun autre mode ne s'applique
**Déclenchement** : toujours disponible comme fallback + ~30-60% des cartes éligibles pour d'autres modes

**UX** :
- Champ texte classique avec placeholder
- Validation au clic ou touche Entrée
- `autoFocus` pour commencer à taper immédiatement
- Boutons "Valider" et "Voir la réponse"

**Intérêt pédagogique** : Le rappel actif (taper la réponse de mémoire) reste le mode le plus efficace pour l'ancrage à long terme. Conservé comme mode principal.

---

## Algorithme de sélection du mode

```
detectMode(card, allCards, allowedModes?) :
  0. allowedModes = card.allowedModes ?? deck.allowedModes ?? null
     (null = tous les modes autorisés)
  1. Si réponse ∈ {oui, non, yes, no, vrai, faux, true, false} et "yesno" autorisé → yesno
  2. Si réponse = nombre et "number" autorisé → number
  3. seed = hash(cardId) + jour_courant
     roll = seed % 10
  4. Si réponse ≥ 3 mots :
       roll 0-3 et "scramble" autorisé → scramble (40%)
       roll 4-5 et "fillblank" autorisé → fillblank (20%)
       roll 6-7 et deck ≥ 4 cartes et "mcq" autorisé → mcq (20%)
       roll 8-9 et "text" autorisé → text (20%)
  5. Si deck ≥ 4 cartes :
       roll 0-3 et "mcq" autorisé → mcq (40%)
       roll 4-9 et "text" autorisé → text (60%)
  6. Sinon → text (fallback ultime)
```

**Variété quotidienne** : le seed inclut `Math.floor(Date.now() / 86400000)`, donc le mode change chaque jour pour une même carte. Cela évite la monotonie tout en restant déterministe au sein d'une session.

**Filtrage par `allowedModes`** : si un mode est sélectionné par le roll mais n'est pas dans la liste `allowedModes`, l'algorithme passe au mode suivant. Cela garantit que les decks factuels (civique, drapeaux) n'affichent jamais de scramble ou fillblank.

---

## Tolérance de la validation

La validation utilise deux mécanismes complémentaires dans `lib/text.ts` :

### 1. Normalisation (`normalizeText`)

Appliquée sur la saisie utilisateur **et** la réponse attendue avant comparaison :

| Tolérance | Exemple attendu | Saisie acceptée |
|---|---|---|
| **Accents** | `peut-être` | `peut etre` |
| **Casse** | `Paris` | `paris` |
| **Tirets** | `au-dessus` | `au dessus` |
| **Ponctuation** (virgule, point, `;`, `:`, `!`, `?`, `()`) | `oui, bien sûr !` | `oui bien sur` |
| **Espaces multiples** | `mot  mot` | `mot mot` |
| **Apostrophes typographiques** (`'` `'`) | `l'homme` | `l'homme` |

**Pipeline** :
```
entrée → trim → lowercase → supprime accents (NFD) → ' ' → ' ' → - → espace
→ ponctuation → espace → espaces multiples → un seul → trim
```

### 2. Fuzzy match avec mots-outils optionnels (`isCorrect`)

Pour les réponses de 2+ mots, après échec du match exact, un fuzzy match est tenté :
- Les **mots-outils** (articles, prépositions) sont retirés de la liste des mots requis
- Seuls les **mots de contenu** doivent être présents dans la saisie
- L'**ordre des mots** n'est pas vérifié

**Mots-outils ignorés** :
- **FR** : `le`, `la`, `les`, `l`, `un`, `une`, `des`, `du`, `de`, `d`, `au`, `aux`
- **EN** : `the`, `a`, `an`, `of`

| Exemple attendu | Saisie acceptée | Pourquoi |
|---|---|---|
| `le traité de Versailles` | `traité Versailles` | `le` et `de` sont des mots-outils |
| `la tour Eiffel` | `tour Eiffel` | `la` est un mot-outil |
| `un chat noir` | `chat noir` | `un` est un mot-outil |
| `the United Kingdom` | `United Kingdom` | `the` est un mot-outil |
| `le grand chien` | `grand chien` | `le` ignoré, ordre libre |

**Garde-fous** :
- Si la réponse n'est composée **que** de mots-outils (ex: `le de`), ils restent tous requis
- Le match exact reste strict : taper la réponse complète avec articles fonctionne toujours
- Le fuzzy match ne s'applique qu'aux réponses de 2+ mots

### 3. Évaluation IA (fallback, mode texte uniquement)

Quand le match local échoue en mode `text` et que l'utilisateur est en ligne, une évaluation IA est tentée via `evaluateAnswer()`. Si la réponse est jugée acceptable, elle est ajoutée aux réponses locales de la carte pour les prochaines fois.

**Note** : l'évaluation IA est contrôlée par le flag `aiVerify` (par deck avec override par carte). Si `aiVerify` est désactivé, aucun appel IA n'est effectué et la réponse est jugée uniquement par le matching local. Voir `docs/AI-ANSWER-EVALUATION.md` pour les détails.

### Non toléré

- Mots de contenu manquants
- Chiffres incorrects
- Apostrophes manquantes (`lhomme` pour `l'homme`)

---

## Architecture technique

### Intégration avec StudyView

```
StudyView
  ├── Header
  ├── ProgressBar
  └── Card
       ├── Question + Image + Audio
       ├── AnswerInput (key={cardId})
       │    ├── YesNoInput
       │    ├── NumberInput
       │    ├── ScrambleInput
       │    ├── McqInput
       │    ├── FillBlankInput      ← NOUVEAU
       │    └── TextInputMode
       └── ResultSection (après validation)
```

**Props** :
| Prop | Type | Description |
|------|------|-------------|
| `card` | `CardFromApi` | Carte courante (question, answers, id, fillBlanks, allowedModes) |
| `allCards` | `CardFromApi[]` | Toutes les cartes du deck (pour MCQ) |
| `allowedModes` | `string[] \| null` | Modes autorisés (null = tous). Calculé par StudyView : `card.allowedModes ?? deck.allowedModes ?? null` |
| `onAnswer` | `(string, AnswerMode) => void` | Callback quand l'utilisateur soumet une réponse |
| `onShowAnswer` | `() => void` | Callback pour "Voir la réponse" (pas de notation) |

**Flux de données** :
1. `AnswerInput` reçoit la carte et détecte le mode
2. L'utilisateur interagit (clic, drag, saisie)
3. `onAnswer(string)` remonte la réponse au parent
4. `StudyView.handleAnswer()` appelle `isCorrect()`, grade la carte, sauvegarde en IndexedDB, queue la review pour sync

**Key prop** : `key={current.id}` sur `AnswerInput` force le remount complet à chaque nouvelle carte, réinitialisant tous les états internes.

### Utilitaires

- `hashCode(string)` : hash déterministe pour le seeding
- `seededShuffle(array, seed)` : Fisher-Yates avec LCG (Linear Congruential Generator)
- `normalizeText()` (réutilisé depuis `lib/text.ts`) : normalisation pour comparaisons

### CSS

- Animation `chipIn` dans `globals.css` : apparition des mots dans la zone de dépôt
- Classe `.answer-chip-enter` : applique l'animation

---

## Résultats

### Ce qui fonctionne bien

- **Détection automatique** : les modes yesno et number sont toujours corrects car basés sur le contenu de la réponse
- **Zéro configuration** : aucune modification des données de cartes existantes nécessaire
- **Compatibilité** : fonctionne avec toutes les listes existantes sans migration
- **Validation unifiée** : tous les modes passent par `isCorrect()` existant, la notation reste identique
- **Offline-first** : aucune dépendance réseau ajoutée, tout est côté client
- **Tests** : 172 tests existants passent sans modification

### Distribution estimée des modes

Pour un deck typique de 20+ cartes avec des réponses variées :
- ~5-10% yesno (si des cartes vrai/faux)
- ~5-10% number (si des cartes numériques)
- ~25% scramble (réponses multi-mots)
- ~20-25% mcq
- ~35-40% text

---

## Pistes d'amélioration

### Court terme (quick wins)

1. **Indices premiers caractères** : pour le mode texte, afficher `P____` (première lettre + longueur) comme aide optionnelle après un premier échec

2. **Feedback visuel du résultat MCQ/YesNo** : colorer brièvement le bouton cliqué en vert/rouge avant d'afficher le résultat complet (flash de 200ms)

3. **Mode écoute seule** : pour les cartes avec audio, proposer d'écouter et taper ce qu'on entend (dictée), au lieu de lire la question

4. **Compteur de mots restants dans scramble** : afficher "3/7 mots placés" pour les longues réponses

### Moyen terme

5. **Touch drag natif pour scramble** : implémenter le drag via `pointer events` (pointerdown/pointermove/pointerup) pour une vraie expérience de glisser sur mobile, avec un clone flottant qui suit le doigt

6. **Mode "lettres manquantes"** : afficher `P_r_s` et l'utilisateur complète les lettres masquées. Nombre de lettres masquées augmente avec les bonnes réponses successives (difficulté adaptative)

7. **Adaptation au niveau de maîtrise** : forcer le mode `text` (rappel actif) pour les cartes avec un `ease` élevé (bien connues), et favoriser `mcq`/`scramble` (reconnaissance) pour les cartes nouvelles ou difficiles (`reps < 2` ou `ease < 1.8`)

8. **Scramble avec réordonnement drag** : permettre de réordonner les mots déjà placés dans la zone de réponse par glisser-déposer, plutôt que de devoir retirer et replacer

### Long terme

9. **Matching pairs** : pour les decks de vocabulaire, afficher 4-5 questions et 4-5 réponses côte à côte, l'utilisateur les associe par paires (mode de révision groupée)

10. **Mode image** : si la carte a une `imageUrl`, proposer de masquer le texte de la question et ne montrer que l'image, forçant l'association visuelle

11. **Métriques par mode** : tracker le taux de réussite par mode (dans les reviews sync) pour ajuster automatiquement la distribution. Si l'utilisateur réussit 95% en MCQ mais 60% en texte, augmenter la fréquence du mode texte

12. **Mode audio-only** : si la carte a `audioUrlEn`, jouer l'audio sans montrer le texte de la question. L'utilisateur doit reconnaître le mot/phrase entendu. Utile pour les langues

13. **Saisie progressive** : pour les très longues réponses (5+ mots), combiner scramble (premiers mots) + texte libre (derniers mots) pour une difficulté hybride

14. **Personnalisation utilisateur** : permettre à l'utilisateur de forcer un mode préféré dans les paramètres (ex: "toujours texte" pour les puristes, "jamais scramble", etc.)
