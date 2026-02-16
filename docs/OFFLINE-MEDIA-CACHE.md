# Cache media hors-ligne

## Strategie

Strategie hybride (Phase 1 : auto-cache de la liste courante) :

1. **Auto-cache** : quand l'utilisateur ouvre une liste pour reviser, tous les fichiers media (audio TTS EN/FR + images) sont precaches en arriere-plan via le Service Worker
2. **Warning offline** : si l'utilisateur ouvre une liste dont les media ne sont PAS caches alors qu'il est hors-ligne, un toast orange l'avertit
3. **Phase 2 (a venir)** : bouton "Telecharger" explicite par liste pour les power users

## Architecture

```
handleStudy(deck) — apps/web/src/app/page.tsx
  |
  +-> precacheDeckMedia(deckId, cards) — fire-and-forget
  |     |
  |     +-> extractMediaUrls(cards) — dedupe audioUrlEn/Fr + imageUrl
  |     +-> idbSet("media-cache:<deckId>", { status: "caching" })
  |     +-> sw.postMessage({ type: "CACHE_DECK_MEDIA", urls })
  |
  v
Service Worker — apps/web/public/sw.js
  |
  +-> cacheDeckMedia(deckId, urls, client)
  |     +-> Pour chaque URL : cache.match() -> skip si deja cache, sinon fetch + cache.put
  |     +-> Toutes les 10 URLs : client.postMessage("MEDIA_CACHE_PROGRESS")
  |     +-> Fin : client.postMessage("MEDIA_CACHE_COMPLETE")
  |
  v
initMediaCacheListener() — apps/web/src/lib/media-cache.ts
  |
  +-> Ecoute messages SW -> dispatche CustomEvents
  |
  v
useSyncStatus() — apps/web/src/hooks/useSyncStatus.ts
  |
  +-> mediaCaching / mediaCacheDone / mediaOfflineWarning
  |
  v
SyncStatus.tsx — Toast bottom-right
  +-> Bleu spin "Mise en cache audio 45%"
  +-> Vert check "Audio disponible hors ligne" (3s)
  +-> Orange alert "Audio non disponible hors ligne" (4s)
```

## Fichiers impliques

| Fichier | Role |
|---|---|
| `apps/web/public/sw.js` | Handler `CACHE_DECK_MEDIA`, fonction `cacheDeckMedia` |
| `apps/web/src/lib/media-cache.ts` | Orchestrateur client : extract URLs, envoi SW, tracking IDB |
| `apps/web/src/hooks/useSyncStatus.ts` | Etats React pour les toasts media |
| `apps/web/src/components/SyncStatus.tsx` | Rendu des 3 toasts media |
| `apps/web/src/app/page.tsx` | Declenchement dans `handleStudy()` + warning offline |
| `apps/web/src/lib/i18n.ts` | Section `mediaCache` (FR + EN) |

## Stockage

- Les media sont caches dans le **SW Cache API** (cache `memolist-v2`), le meme cache que les assets statiques
- Le statut de cache par deck est stocke dans **IndexedDB** sous la cle `media-cache:<deckId>`
- Les fichiers audio TTS ont des headers `Cache-Control: public, max-age=31536000, immutable` (1 an)

### Estimation taille

- 1 carte avec audio EN + FR : ~60 KB (2 x ~30 KB MP3)
- 1 liste de 50 cartes : ~3 MB
- 10 listes actives : ~30 MB

## Types de media caches

| Champ carte | Exemple URL | Type |
|---|---|---|
| `audioUrlEn` | `/storage/tts/en/card-123.mp3` | Audio MP3 (TTS anglais) |
| `audioUrlFr` | `/storage/tts/fr/card-456.mp3` | Audio MP3 (TTS francais) |
| `imageUrl` | `/storage/images/card-789.jpg` | Image question |

Les URLs completes sont construites : `STORAGE_BASE + card.audioUrlEn`
- Dev : `http://localhost:3001/storage/tts/...`
- Prod : `/storage/tts/...` (meme origine, nginx)

## Comportement detaille

### Ouverture d'une liste (online)
1. `handleStudy()` fetch les cartes via API
2. Les cartes sont cachees en IDB (existant)
3. `precacheDeckMedia()` est appele en fire-and-forget (non bloquant)
4. Le SW telecharge et cache chaque fichier media
5. Toast bleu avec progression -> toast vert "Audio disponible hors ligne"

### Ouverture d'une liste (offline, media deja caches)
1. `handleStudy()` utilise les cartes depuis le cache IDB
2. Le SW sert les media depuis le cache (strategie cache-first existante)
3. Experience transparente, audio et images fonctionnent

### Ouverture d'une liste (offline, media PAS caches)
1. Toast orange "Audio non disponible hors ligne pour cette liste"
2. L'utilisateur peut quand meme reviser (texte), mais sans audio/images
3. Au retour en ligne, la prochaine ouverture declenchera le precache

### Meme liste ouverte 2 fois
- `cache.match(url)` detecte les fichiers deja caches -> skip (quasi instantane)
- Pas de re-telechargement inutile

### Echec partiel (deconnexion pendant le cache)
- Le SW echoue silencieusement sur les URLs restantes
- `MEDIA_CACHE_COMPLETE` est envoye avec `cached < total`
- Le statut IDB reflete le nombre reel de fichiers caches
- A la prochaine ouverture online, les fichiers manquants seront rattrapes

## Priorite des toasts (SyncStatus.tsx)

Ordre de rendu (premier match gagne) :

1. Sync data en cours (bleu spin)
2. **Media caching en cours** (bleu spin + pourcentage)
3. Offline + operations en attente (orange)
4. Offline simple (jaune)
5. **Warning media offline** (orange)
6. Erreur sync (rouge)
7. Operations en attente (bleu)
8. **Media cache termine** (vert)
9. Sync data terminee (vert)

## Phase 2 — Evolutions prevues

- [ ] Bouton "Telecharger pour hors-ligne" par liste (UI explicite)
- [ ] Indicateur visuel sur chaque liste (icone "disponible offline")
- [ ] Eviction LRU des listes non consultees depuis 30 jours
- [ ] Precache prioritaire des cartes "a reviser bientot" (basee sur le SRS)
- [ ] Gestion du quota Storage (estimation + warning si espace insuffisant)
