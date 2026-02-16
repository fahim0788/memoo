# Brainstorming — Méthodes d'apprentissage scientifiques

> Basé sur la vidéo [Science Étonnante — Comment mieux apprendre](https://www.youtube.com/watch?v=RVB3PBPxMWg)
> Transcription complète : `docs/VIDEO-SCIENCE-ETONNANTE-APPRENDRE.md`

---

## Couverture actuelle de MemoList

### Ce qu'on fait déjà bien

| Principe scientifique | Implémentation actuelle | Qualité |
|---|---|---|
| Répétition espacée | SM-2 (intervalles 1j → 3j → ×ease), IndexedDB | ★★★ |
| Auto-tests / récupération active | 6 modes : texte, QCM, fill-blanks, scramble, oui/non, nombre | ★★★ |
| Multimodalité | Audio EN/FR, images, texte, tactile (MiniKeyboard, drag-and-drop) | ★★☆ |
| Feedback immédiat | Correction instantanée + audio réponse + évaluation IA | ★★★ |
| Boîte de Leitner (version algo) | SM-2 = ease factor continu, reset au compartiment 1 si erreur | ★★★ |
| Motivation / discipline | Streak, stats par deck, leaderboard, compteur du jour | ★★☆ |

**Constat** : le socle SRS + auto-tests est solide. C'est exactement les 2 premiers piliers de la vidéo. L'app couvre bien le "mémoriser", moins le "comprendre / résoudre / créer".

### Ce qui manque

| Principe scientifique | Statut actuel |
|---|---|
| Diversification / interleaving | Étude mono-deck uniquement |
| Rappel libre (free recall) | Absent |
| Apprentissage génératif (reformulation, création) | Absent |
| Cartes mentales / schématisation | Absent |
| Enseignement / méthode Feynman | Absent |
| Métacognition (recul sur son apprentissage) | Stats basiques, pas d'insights |
| Connexions entre connaissances | Pas de liens entre cartes |
| Progression adaptative des modes | Sélection aléatoire (hash + seed jour) |

---

## Pistes d'amélioration

### 1. Progression adaptative des modes de réponse

**Principe** : la vidéo dit QCM (reconnaissance) < texte libre (production) < reformulation. Actuellement les modes sont choisis aléatoirement par hash.

**Idée** : adapter le mode au niveau de maîtrise de la carte.

| Niveau SRS (reps) | Modes privilégiés | Difficulté cognitive |
|---|---|---|
| 0-1 (découverte) | QCM, oui/non, nombre | Reconnaissance |
| 2-3 (apprentissage) | Fill-blanks, scramble | Reconstruction |
| 4+ (consolidation) | Texte libre, inversion Q/A | Production |

**Implémentation possible** :
- Modifier le sélecteur de mode dans `AnswerInput.tsx`
- Lire `cardState.reps` depuis le state SRS en IndexedDB
- Pondérer les probabilités de chaque mode selon le niveau
- Garder le hash pour la reproductibilité intra-journée

**Impact** : fort — simule la progression naturelle reconnaissance → rappel actif
**Effort** : moyen — logique de sélection à refactorer

---

### 2. Étude mixte multi-decks (interleaving)

**Principe** : mélanger les sujets en petites sessions force le cerveau à discriminer "de quoi on parle" avant de mobiliser les bonnes connaissances. Crée plus d'amorces de récupération croisées.

**Idée** : mode "étude mixte" qui pioche des cartes dues dans plusieurs decks.

**Scénarios** :
- Bouton "Étudier tout" sur la page d'accueil → session mixte avec toutes les cartes dues
- Sélection manuelle de 2-3 decks à mélanger
- Badge visuel indiquant de quel deck vient chaque carte (contexte)

**Implémentation possible** :
- Nouveau composant `MixedStudyView` (ou paramètre `deckIds[]` sur `StudyView`)
- Agréger les `CardState` de plusieurs decks
- Mélanger les cartes dues toutes origines confondues
- Afficher un tag discret avec le nom du deck sur chaque carte

**Impact** : fort — principe scientifiquement très solide, avantage compétitif vs Anki
**Effort** : faible-moyen — la mécanique SRS existe déjà, il faut juste agréger

---

### 3. Inversion Question/Réponse

**Principe** : créer ses propres questions est un puissant levier d'apprentissage génératif. Inverser le sens (afficher la réponse, demander la question) force la reformulation.

**Idée** : nouveau mode de réponse "inversé".

**Fonctionnement** :
- L'app affiche la **réponse** comme prompt
- L'utilisateur doit formuler la **question** correspondante
- Évaluation IA : la question formulée est-elle pertinente par rapport à la paire Q/A originale ?
- Variante simplifiée : QCM de questions (1 bonne + 3 questions d'autres cartes)

**Exemples** :
```
Affiché :  "1789"
Attendu :  "Date de la Révolution française" (ou équivalent)

Affiché :  "H₂O"
Attendu :  "Formule chimique de l'eau" (ou équivalent)
```

**Implémentation possible** :
- Nouveau mode `reverse` dans `AnswerInput.tsx`
- Prompt IA d'évaluation spécifique (la question est-elle sémantiquement valide pour cette réponse ?)
- Déclenchement : cartes à haut niveau SRS (reps ≥ 4) pour varier l'exercice

**Impact** : moyen — double les amorces de récupération (Q→R et R→Q)
**Effort** : faible — réutilise l'infra IA d'évaluation existante

---

### 4. Auto-évaluation de confiance (métacognition)

**Principe** : la métacognition — réfléchir sur ses propres connaissances — est un méta-skill essentiel. La vidéo dit que les méthodes passives (relecture, surlignage) donnent "l'illusion de maîtriser". L'auto-évaluation de confiance révèle ces illusions.

**Idée** : avant de voir la réponse, demander à l'utilisateur son niveau de confiance.

**Fonctionnement** :
- Après soumission de la réponse, avant la correction : "Tu es sûr(e) ?" → 😟 Pas sûr / 😐 Moyen / 😊 Sûr
- Comparer confiance vs résultat réel
- Tracker 4 catégories : sûr+juste ✓, sûr+faux ⚠️, pas sûr+juste 💡, pas sûr+faux ✗

**Insights possibles** :
- "Tu surestimes tes connaissances sur le chapitre X" (beaucoup de sûr+faux)
- "Tu te sous-estimes en chapitre Y" (beaucoup de pas sûr+juste)
- Score de calibration global : % de fois où la confiance correspond au résultat
- Ciblage SRS : les cartes "sûr+faux" méritent un traitement spécial (illusion de savoir)

**Implémentation possible** :
- 3 boutons de confiance dans `StudyView` entre soumission et correction
- Champ `confidence: 1|2|3` ajouté au `Review` model
- Dashboard métacognition dans les stats
- Optionnel : désactivable pour ne pas alourdir le flow

**Impact** : moyen — développe la métacognition, identifie les angles morts
**Effort** : faible — 3 boutons + 1 champ en base

---

### 5. Rappel libre (Free Recall)

**Principe** : écrire tout ce dont on se souvient, sans aide, avant de vérifier. La vidéo dit que c'est "particulièrement efficace car ça oblige à reformuler avec ses propres mots" et que "plus on va chercher loin dans sa mémoire, plus l'ancrage sera fort".

**Idée** : avant une session d'étude sur un chapitre/deck, l'utilisateur fait un rappel libre.

**Fonctionnement** :
1. L'utilisateur choisit un deck/chapitre
2. Écran "Rappel libre" : zone de texte libre, timer 5 min, pas d'aide
3. L'utilisateur écrit tout ce qu'il sait sur le sujet
4. Soumission → l'IA compare avec les cartes du deck
5. Résultat : cartes "retrouvées" ✓ vs "oubliées" ✗
6. Lancer ensuite la session classique en priorisant les cartes oubliées

**Variante simplifiée** (sans IA) :
- Afficher la liste des questions du deck après le rappel libre
- L'utilisateur coche lui-même ce qu'il avait retrouvé
- Moins magique mais zéro coût IA

**Implémentation possible** :
- Nouveau composant `FreeRecallView`
- Prompt IA : extraire les concepts mentionnés et les matcher aux cartes
- Optionnel pré-session (skip possible pour ne pas bloquer)
- Tracking : stocker les résultats de rappel libre pour voir la progression

**Impact** : fort — technique scientifiquement très puissante, rare dans les apps
**Effort** : moyen — nouveau flow + évaluation IA

---

### 6. Mode "Explique" / Méthode Feynman

**Principe** : "quand on essaye de transmettre quelque chose de façon claire, on se rend très vite compte si on n'a pas vraiment compris". La méthode Feynman = expliquer comme à un enfant de 8 ans.

**Idée** : mode de réponse où l'utilisateur doit expliquer un concept, pas juste le nommer.

**Fonctionnement** :
- Question spéciale : "Explique [concept] en termes simples"
- L'utilisateur rédige une explication (3-5 phrases)
- L'IA évalue : les points clés sont-ils couverts ? L'explication est-elle correcte ?
- Feedback : points couverts ✓, points manquants ✗, erreurs éventuelles ⚠️

**Exemples** :
```
Question :  "Explique ce qu'est l'énergie cinétique"
Réponse attendue (points clés) :
  - Énergie liée au mouvement
  - Dépend de la masse et de la vitesse
  - Formule Ec = ½mv²
```

**Déclenchement** :
- Cartes à très haut niveau SRS (reps ≥ 5) — l'utilisateur "sait" déjà, on teste la compréhension
- Optionnel / activable par deck
- Seulement pour les cartes dont la réponse est conceptuelle (pas les dates ou chiffres)

**Implémentation possible** :
- Nouveau mode `explain` dans `AnswerInput.tsx`
- Prompt IA avec les points clés extraits de la question + réponse originale
- Évaluation multi-critères : couverture, exactitude, clarté
- UI : textarea + feedback structuré (checklist de points)

**Impact** : très fort — teste la compréhension profonde, pas juste la mémorisation
**Effort** : élevé — nouveau mode + prompt IA complexe + UI dédiée

---

### 7. Vue carte mentale / connexions

**Principe** : la carte mentale "coche beaucoup de principes efficaces d'apprentissage". Visualiser les liens entre concepts crée des schémas mentaux et des amorces de récupération multiples.

**Idée** : vue visuelle des cartes d'un chapitre/deck sous forme de graphe ou d'arbre.

**Scénarios** :
- **Vue arbre** (simple) : deck → chapitres → cartes, avec indicateurs de maîtrise (couleur)
- **Vue graphe** (avancé) : nœuds = cartes, arêtes = liens thématiques (générés par IA)
- **Vue résumé** : l'IA génère une carte mentale textuelle du chapitre (markdown indented list)

**Variante MVP** :
- Pas de vrai graphe interactif (lourd)
- L'IA génère un résumé structuré en arbre du chapitre (texte)
- Affiché comme overview avant la session d'étude
- L'utilisateur peut contribuer en ajoutant des liens manuels entre cartes

**Implémentation possible** :
- Route IA `/api/lists/[deckId]/mindmap` → génère l'arbre conceptuel
- Composant `MindMapView` : rendu simple (indented list ou tree CSS)
- Évolution future : lib type D3.js ou react-flow pour le graphe interactif
- Liens entre cartes : champ `relatedCardIds` sur le modèle Card

**Impact** : moyen — puissant pour la compréhension, mais usage plus passif
**Effort** : élevé — nouveau concept, UI complexe si interactif

---

## Matrice de priorisation

```
            Impact apprentissage
                 ▲
          Fort   │  5.Rappel libre    1.Progression    6.Feynman
                 │                       adaptative
                 │  2.Interleaving
                 │
         Moyen   │  4.Métacognition   3.Inversion Q/A
                 │
                 │                    7.Carte mentale
         Faible  │
                 └──────────────────────────────────────►
                   Faible            Moyen           Élevé
                                Effort dev
```

### Recommandation de séquençage

| Phase | Pistes | Justification |
|---|---|---|
| **v1 — Quick wins** | 1. Progression adaptative des modes | Fort impact, s'intègre dans le code existant |
| | 2. Interleaving multi-decks | Fort impact, faible effort, différenciant |
| | 4. Auto-évaluation de confiance | Développe la métacognition, 3 boutons à ajouter |
| **v2 — Génératif** | 3. Inversion Q/A | Nouveau mode, réutilise l'infra IA |
| | 5. Rappel libre | Technique puissante, nouveau flow |
| **v3 — Compréhension** | 6. Mode Feynman | Teste la compréhension profonde |
| | 7. Carte mentale | Visualisation des connexions |

---

## Références

- Vidéo source : [Science Étonnante — Comment mieux apprendre](https://www.youtube.com/watch?v=RVB3PBPxMWg)
- Transcription : [`docs/VIDEO-SCIENCE-ETONNANTE-APPRENDRE.md`](VIDEO-SCIENCE-ETONNANTE-APPRENDRE.md)
- Algorithme SM-2 : `apps/web/src/lib/sr-engine.ts`
- Sélection des modes : `apps/web/src/components/AnswerInput.tsx`
- Évaluation IA : [`docs/AI-ANSWER-EVALUATION.md`](AI-ANSWER-EVALUATION.md)
