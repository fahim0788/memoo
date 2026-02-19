# Recherche dans le contenu des decks

## Objectif

Etendre la barre de recherche de l'ecran principal (MenuView) pour chercher aussi dans le **contenu des cartes** (questions et reponses), pas seulement dans le nom du deck.

## Approche

- Recherche **client-side uniquement** dans les cartes cachees en IndexedDB
- Pas d'appel API pour la recherche
- Debounce 300ms pour eviter de surcharger les lectures IndexedDB
- Minimum 2 caracteres pour declencher la recherche dans les cartes
- Les decks sans cache de cartes (jamais etudies) ne sont cherches que par nom

## Fichiers a modifier

### 1. `apps/web/src/lib/api-cache.ts`

Ajouter une fonction `searchCachedCards(deckIds, query)` :
- Lit en parallele les caches IndexedDB `cache:cards:{deckId}`
- Cherche dans `card.question` et `card.answers` (case-insensitive)
- Retourne `Map<deckId, nombre de cartes matchees>`
- Aucun appel API

### 2. `apps/web/src/components/MenuView.tsx`

- Ajouter `useEffect` + `useRef` pour le debounce
- Importer `searchCachedCards`
- Nouvel etat `cardMatches: Map<string, number>` + `cardSearching: boolean`
- Fusionner les resultats : decks matchant par nom d'abord, puis decks matchant par contenu
- Afficher un indicateur sous le nom du deck quand le match vient des cartes (ex: "3 cartes trouvees")

### 3. `apps/web/src/lib/i18n.ts`

- Mettre a jour `menuView.searchPlaceholder` : "Rechercher liste ou contenu..." / "Search list or content..."
- Ajouter `menuView.cardMatches` : `(n) => "X carte(s) trouvee(s)"` / `(n) => "X card(s) found"`

## Algorithme

1. L'utilisateur tape dans la barre de recherche
2. Filtrage par nom = synchrone, instantane (comportement actuel conserve)
3. Apres 300ms sans frappe, `searchCachedCards` lit les caches IndexedDB en parallele
4. Pour chaque deck avec cache, cherche dans `question` et `answers[]`
5. Resultat fusionne : decks par nom d'abord, puis decks par contenu uniquement
6. Boutons de reordonnancement masques pendant la recherche (existant)

## Verification

- Mot present dans une carte mais pas dans le nom du deck → le deck apparait
- Query de 1 caractere → seule la recherche par nom
- Deck sans cache de cartes → n'apparait que si le nom matche
- Recherche videe → tous les decks affiches
- Fonctionne en mode offline (IndexedDB uniquement)
- Themes clair/sombre : utilise les CSS variables existantes
