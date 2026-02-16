# Service Worker - Strategie de cache et mise a jour

## Vue d'ensemble

Le Service Worker (`apps/web/public/sw.js`) gere le cache des assets pour le mode offline.
Deux systemes de stockage distincts coexistent :

| | **Cache API** (SW) | **IndexedDB** (App) |
|---|---|---|
| Contient | HTML, CSS, JS, images, audio TTS | Donnees app (cartes, decks, queue offline) |
| Gere par | `sw.js` via `caches.open()` | Code app (`api-cache.ts`) |
| Nettoye lors d'un deploy | Oui (ancien cache supprime) | Non (donnees preservees) |
| Taille typique | ~30 MB (10 listes actives) | Variable |

## Strategies de cache par type de requete

| Type | Strategie | Raison |
|---|---|---|
| Navigation (`req.mode === "navigate"`) | **Network-first** | Toujours servir le HTML le plus recent |
| Appels API (`/api/*`) | **Network-only** | Donnees temps reel, fallback JSON offline |
| Assets same-origin (CSS, JS, images) | **Cache-first + revalidate** | Performance, mise a jour en arriere-plan |
| Media TTS (`/storage/tts/*`) | Cache via SW `CACHE_DECK_MEDIA` | Precache explicite par liste |

## Cycle de mise a jour automatique

Quand un deploy modifie `sw.js` :

```
1. Navigateur detecte changement byte-level dans sw.js
   (verification automatique a chaque navigation)
        |
2. Nouveau SW s'installe en arriere-plan
   install -> caches.open("memolist-v3") -> cache.addAll(ASSETS)
        |
3. skipWaiting() -> activation immediate (pas d'attente)
        |
4. Activation :
   a) Suppression des anciens caches (memolist-v2, etc.)
   b) clients.claim() -> prend le controle des onglets
   c) client.navigate(url) -> force-reload tous les onglets
        |
5. Utilisateur voit la nouvelle version sans action manuelle
```

## Configuration nginx

Le fichier `sw.js` doit **toujours** etre revalide par le navigateur.
Sans cela, un proxy ou CDN pourrait servir une version perimee.

```nginx
# infra/nginx/nginx.prod.conf
location = /sw.js {
    proxy_pass http://web_upstream;
    # ... proxy headers ...
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}
```

Cela ne concerne que le fichier `sw.js` (~5 KB). Les assets de l'app restent caches normalement par le SW.

## Versionning du cache

Le nom du cache (`CACHE_NAME = "memolist-v3"`) ne doit etre incremente que lors d'un changement de **structure** du cache (ajout/suppression d'assets precaches, changement de strategie).

Les deploys normaux n'ont pas besoin de modifier `CACHE_NAME` car :
- La navigation est network-first (HTML toujours frais)
- Les assets sont cache-first + revalidate (mis a jour en arriere-plan)
- Le SW lui-meme est revalide grace aux headers nginx no-cache

## Garantie de fraicheur par type de fichier

| Fichier | Pourquoi toujours frais |
|---|---|
| `sw.js` | nginx `no-cache` → navigateur revalide a chaque visite |
| HTML (`/`) | SW network-first → toujours recupere du serveur |
| JS/CSS (`_next/static/*`) | Next.js utilise des noms hashes (`abc123.js`). Nouveau HTML = nouvelles URLs = nouveaux fichiers |
| Audio TTS | Immutables par design (le contenu ne change jamais pour une URL donnee) |
| Manifest | Precache par le SW a chaque install, donc mis a jour avec le nouveau SW |

Le seul cas ou l'utilisateur voit une ancienne version : **il est offline**. C'est le comportement attendu (mode hors-ligne).

## Fichiers

| Fichier | Role |
|---|---|
| `apps/web/public/sw.js` | Service Worker principal |
| `infra/nginx/nginx.prod.conf` | Headers no-cache pour sw.js (prod) |
| `infra/nginx/nginx.local.conf` | Headers no-cache pour sw.js (local) |
| `apps/web/src/lib/media-cache.ts` | Precache media TTS via SW |

## Depannage

### Ecran noir apres un deploy

**Cause** : ancien SW servait du HTML cache (strategie cache-first).
**Correction** : sw.js v3 utilise network-first pour la navigation.
**Si un utilisateur est encore bloque** :
```
DevTools > Application > Service Workers > Unregister
```
Ou navigation privee pour verifier que le site fonctionne.

### Verifier les headers nginx

```bash
curl -I https://memoo.fr/sw.js | grep -i cache-control
# Attendu : Cache-Control: no-cache, no-store, must-revalidate
```

### Verifier la version du SW active

```
DevTools > Application > Service Workers
# Affiche la version en cours et si une mise a jour est en attente
```
