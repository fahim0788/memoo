# Strategie de cache IA (OpenAI)

Vue d'ensemble du cache des 3 fonctionnalites IA du projet. Toutes utilisent `gpt-4o-mini`.

> Detail de l'evaluation des reponses : voir [AI-ANSWER-EVALUATION.md](AI-ANSWER-EVALUATION.md)

---

## Resume

| Fonctionnalite | Cache serveur (DB) | Colonne / Table | Appels IA |
|---|---|---|---|
| Distracteurs QCM | **Oui** | `Card.distractors` (Json) | 1 par carte, a vie |
| Evaluation reponse | Non (contextuel) — enrichit `answers` | `Card.answers` (Json) | Decroissant avec le temps |
| Classification chapitres | **Oui** | `Chapter` + `Card.chapterId` | 1 par deck (re-executable) |

Le cache local (IndexedDB) sert uniquement de couche offline-first pour les donnees deja en DB. Il n'a aucun role dans l'economie d'appels IA — seul le cache DB compte.

---

## 1. Distracteurs QCM — cache permanent en DB

**Route** : `POST /api/cards/{cardId}/distractors`
**Fichier** : `apps/api/app/api/cards/[cardId]/distractors/route.ts`

### Fonctionnement

```
1er appel (Card.distractors = [])
  → Appel OpenAI → genere 3 distracteurs
  → prisma.card.update({ distractors: [...] })
  → retourne les distracteurs

Appels suivants (Card.distractors.length > 0)
  → retourne directement depuis la DB, zero appel IA
```

### Partage

Les distracteurs sont stockes sur la `Card` (pas sur `UserDeck`). Tous les utilisateurs d'un meme deck beneficient du meme cache. Un seul appel IA par carte, quel que soit le nombre d'utilisateurs.

---

## 2. Evaluation de reponse — cache auto-alimente

**Route** : `POST /api/cards/{cardId}/evaluate`
**Fichier** : `apps/api/app/api/cards/[cardId]/evaluate/route.ts`

### Fonctionnement

```
Reponse utilisateur
  │
  ├─ Match local (isCorrect vs Card.answers[]) ?
  │   └─ OUI → correct, 0 appel IA
  │
  └─ NON → Appel OpenAI
      ├─ IA dit OUI → reponse ajoutee a Card.answers en DB
      │   → les futurs users matchent en local
      └─ IA dit NON → incorrect, rien persiste
```

### Pourquoi ce n'est pas un "cache" classique

L'evaluation IA est contextuelle (la reponse utilisateur change a chaque fois), donc pas cacheable directement. Mais le systeme est **auto-ameliorant** : chaque reponse validee enrichit `Card.answers` en DB, ce qui reduit les futurs appels IA pour tous les utilisateurs.

### Convergence

```
Jour 1  : "la photosynthese" → appel IA → OUI → sauvegarde
Jour 2  : "la photosynthese" → match local direct (0 appel)
Jour 5  : "photosynthesis"   → appel IA → OUI → sauvegarde
Jour 6+ : les deux formes matchent en local (0 appel)
```

Plus il y a d'utilisateurs, plus `Card.answers` converge, moins il y a d'appels IA.

### Guard `aiVerify`

Le flag `aiVerify` (deck ou carte) permet de desactiver completement l'evaluation IA pour les decks factuels (drapeaux, capitales) ou les mauvaises reponses ne convergent jamais. Voir [AI-ANSWER-EVALUATION.md](AI-ANSWER-EVALUATION.md) pour le detail.

---

## 3. Classification en chapitres — cache permanent en DB

**Route** : `POST /api/lists/{deckId}/classify`
**Fichier** : `apps/api/app/api/lists/[deckId]/classify/route.ts`

### Fonctionnement

```
Appel classify
  → Charge toutes les cartes du deck
  → Appel OpenAI (batches de 100 cartes)
  → Supprime les anciens chapitres (idempotent)
  → Cree les Chapter en DB + met a jour Card.chapterId
  → Retourne la liste des chapitres
```

### Partage

Les chapitres sont lies au `Deck` (pas a l'utilisateur). Tous les utilisateurs voient les memes chapitres. La classification n'est relancee que sur action explicite (pas automatique).

---

## Cote serveur : aucun cache en memoire

Toutes les routes API utilisent `export const dynamic = "force-dynamic"`. Il n'y a pas de Redis, pas de cache en memoire, pas de CDN cache. Chaque requete interroge PostgreSQL directement via Prisma.

Les resultats IA sont caches **dans les tables elles-memes** (colonnes JSON ou relations), pas dans une couche de cache intermediaire.

---

## Cout consolide

| Fonctionnalite | Tokens/appel | Cout/appel | Frequence |
|---|---|---|---|
| Distracteurs | ~150 in + ~30 out | ~$0.00003 | 1x par carte |
| Evaluation | ~100 in + ~3 out | ~$0.00002 | Decroissant |
| Classification | ~2000 in + ~500 out | ~$0.0006 | 1x par deck |

Pour 100 utilisateurs actifs, le cout IA converge vers < $0.10/mois grace au cache en DB.

---

## Conclusion : rien a ajouter cote serveur

Le cache IA est deja optimal :
- **Distracteurs** : one-shot en DB, partage entre tous les users
- **Evaluation** : auto-ameliorant via enrichissement de `Card.answers`
- **Classification** : persistee en tables relationnelles
- **Guard aiVerify** : elimine les appels inutiles pour les decks factuels
- **Pas de cache negatif necessaire** : les mauvaises reponses sont trop diverses pour converger
