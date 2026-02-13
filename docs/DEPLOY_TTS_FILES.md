# Stockage Persistant - Guide Complet

Guide pour comprendre et gérer les fichiers persistants (audio TTS, images SVG) en production.

---

## Architecture du stockage

### Les 3 emplacements de fichiers

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PC Local (Windows)                                          │
│     apps/worker/storage/tts/      → MP3 générés en dev          │
│     apps/worker/storage/drapeaux/ → SVG des drapeaux            │
│     ⚠ Gitignorés → ne sont PAS dans le repo Git                │
├─────────────────────────────────────────────────────────────────┤
│  2. Volumes Docker (Pi)                                         │
│     tts-storage:/app/storage/tts  → Monté dans api + worker     │
│     minio-data:/data              → Données MinIO               │
│     ⚠ Perdus si volume supprimé (docker volume rm)              │
├─────────────────────────────────────────────────────────────────┤
│  3. MinIO (Pi) — Source de vérité en prod                       │
│     myminio/memolist-tts/         → Fichiers audio MP3          │
│     myminio/memolist-flags/       → Drapeaux SVG                │
│     ✓ Persistant tant que le volume minio-data existe           │
└─────────────────────────────────────────────────────────────────┘
```

### Flux de requête en production

```
Navigateur → Nginx → MinIO
  /storage/tts/6_en.mp3   →  rewrite → minio:9000/memolist-tts/6_en.mp3
  /storage/flags/france.svg →  rewrite → minio:9000/memolist-flags/france.svg
```

Configuration nginx (`infra/nginx/nginx.prod.conf`) :

```nginx
location /storage/tts/ {
    rewrite ^/storage/tts/(.*)$ /memolist-tts/$1 break;
    proxy_pass http://minio:9000;
    proxy_set_header Host minio:9000;
}

location /storage/flags/ {
    rewrite ^/storage/flags/(.*)$ /memolist-flags/$1 break;
    proxy_pass http://minio:9000;
    proxy_set_header Host minio:9000;
}
```

---

## Deux types de contenu

### Contenu applicatif (init) — SVG drapeaux, decks publics

- **Généré par** : scripts locaux (`generate-flags-deck.js`)
- **Stocké sur** : PC local → transféré manuellement vers MinIO
- **Cycle de vie** : créé une fois, ne change jamais
- **Responsabilité** : développeur (transfert manuel via SCP + mc)

### Contenu utilisateur — Audio TTS

- **Généré par** : le worker via l'API OpenAI TTS
- **Stocké sur** : MinIO directement (quand `STORAGE_TYPE=minio`)
- **Cycle de vie** : créé à la demande par les utilisateurs
- **Responsabilité** : le worker écrit automatiquement dans MinIO

> **Le worker sert uniquement la génération à la demande des utilisateurs.**
> Le contenu initial (drapeaux, decks publics) est géré manuellement par le développeur.

---

## Quand les fichiers sont perdus

| Scénario | Fichiers perdus ? | Explication |
|----------|:-:|---|
| `docker-compose restart` | Non | Les volumes persistent |
| `docker-compose down` | Non | Les volumes persistent |
| `docker-compose down -v` | **OUI** | `-v` supprime les volumes |
| `docker volume rm minio-data` | **OUI** | Suppression explicite du volume |
| `docker system prune --volumes` | **OUI** | Purge tous les volumes non utilisés |
| Rebuild image (`docker build`) | Non | Les images ≠ les volumes |
| `deploy.sh` (script standard) | Non | Ne touche pas aux volumes |
| Corruption SD card du Pi | **OUI** | Tout est perdu |
| Mise à jour Docker Engine | Non | Les volumes persistent |

### Règle d'or

> **Ne jamais utiliser `-v`, `--volumes`, ou `volume rm` en production.**
>
> Le `deploy.sh` standard est sûr — il ne supprime jamais de volumes.

---

## Procédure de déploiement des fichiers

### Prérequis (une seule fois)

Sur le Pi, configurer l'alias MinIO :

```bash
source .env
sudo docker exec memoo-minio mc alias set myminio http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
```

### Déployer les drapeaux SVG

```bash
# 1. Depuis le PC — transférer vers le Pi
scp -r apps/worker/storage/drapeaux/* fahim@<IP_PI>:/tmp/flags/

# 2. Sur le Pi — créer le bucket + upload
sudo docker exec memoo-minio mc mb myminio/memolist-flags --ignore-existing
sudo docker exec memoo-minio mc anonymous set download myminio/memolist-flags
sudo docker cp /tmp/flags/. memoo-minio:/tmp/flags/
sudo docker exec memoo-minio mc cp --recursive /tmp/flags/ myminio/memolist-flags/

# 3. Vérifier
sudo docker exec memoo-minio mc ls myminio/memolist-flags/ | wc -l
curl -s -o /dev/null -w "%{http_code}" https://memoo.fr/storage/flags/france.svg
# → 200

# 4. Nettoyer
rm -rf /tmp/flags
sudo docker exec memoo-minio rm -rf /tmp/flags
```

### Déployer les fichiers audio TTS

```bash
# 1. Depuis le PC — transférer vers le Pi
scp -r apps/worker/storage/tts/* fahim@<IP_PI>:/tmp/tts/

# 2. Sur le Pi — créer le bucket + upload
sudo docker exec memoo-minio mc mb myminio/memolist-tts --ignore-existing
sudo docker exec memoo-minio mc anonymous set download myminio/memolist-tts
sudo docker cp /tmp/tts/. memoo-minio:/tmp/tts/
sudo docker exec memoo-minio mc cp --recursive /tmp/tts/ myminio/memolist-tts/

# 3. Vérifier
sudo docker exec memoo-minio mc ls myminio/memolist-tts/ | wc -l
curl -s -o /dev/null -w "%{http_code}" https://memoo.fr/storage/tts/6_en.mp3
# → 200

# 4. Nettoyer
rm -rf /tmp/tts
sudo docker exec memoo-minio rm -rf /tmp/tts
```

### Importer un deck public (ex: drapeaux)

```bash
# 1. Depuis le PC ou le Pi — appeler l'API
TOKEN=$(curl -s -X POST https://memoo.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "...", "password": "..."}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

node scripts/import-flags-deck.js https://memoo.fr $TOKEN

# 2. Rendre le deck public (ownerId = null)
source .env
sudo docker-compose -f docker-compose.prod.yml exec db \
  psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "UPDATE \"Deck\" SET \"ownerId\" = NULL WHERE name = 'Drapeaux du Monde';"
```

---

## Diagnostic

### Vérifier l'état de MinIO

```bash
# Buckets existants
sudo docker exec memoo-minio mc ls myminio/

# Contenu d'un bucket
sudo docker exec memoo-minio mc ls myminio/memolist-tts/ | wc -l
sudo docker exec memoo-minio mc ls myminio/memolist-flags/ | wc -l

# Espace utilisé
sudo docker exec memoo-minio mc du myminio/
```

### Tester l'accès depuis nginx

```bash
# Drapeaux
curl -s -o /dev/null -w "%{http_code}" https://memoo.fr/storage/flags/france.svg

# Audio
curl -s -o /dev/null -w "%{http_code}" https://memoo.fr/storage/tts/6_en.mp3
```

| Code | Problème | Solution |
|------|----------|----------|
| 200 | OK | - |
| 403 | Bucket pas public | `mc anonymous set download myminio/<bucket>` |
| 404 | Fichier absent | Vérifier upload dans MinIO |
| 502 | MinIO down | `docker-compose restart minio` |

### Vérifier les URLs en base

```bash
source .env
sudo docker-compose -f docker-compose.prod.yml exec db \
  psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT COUNT(*) as total, COUNT(\"audioUrlEn\") as with_audio FROM \"Card\";"
```

---

## Piste d'amélioration : seed automatique

Actuellement, le contenu initial (SVG, decks publics) est déployé **manuellement** (SCP + mc + SQL). C'est fragile et non reproductible.

### Solution recommandée : script de seed

Créer un script `scripts/seed-production.sh` exécuté par `deploy.sh` qui :

1. **Vérifie** si les buckets existent, les crée sinon
2. **Synchronise** les fichiers statiques (SVG) depuis un dossier versionné ou une archive
3. **Importe** les decks publics en base s'ils n'existent pas (`INSERT ... ON CONFLICT DO NOTHING`)
4. **Rend public** les decks applicatifs (`ownerId = NULL`)

```bash
# Exemple d'intégration dans deploy.sh
if should_run "seed"; then
    section $STEP $TOTAL "Seed contenu initial"
    spin "Création buckets MinIO" ensure_buckets
    spin "Sync fichiers statiques" sync_static_files
    spin "Import decks publics" seed_public_decks
fi
```

### Avantages

- **Reproductible** : un nouveau Pi se configure tout seul
- **Idempotent** : peut tourner plusieurs fois sans effet de bord
- **Versionné** : les fichiers statiques dans une archive Git LFS ou un tar
- **Pas de transfert manuel** : plus besoin de SCP

### Alternative minimaliste

Stocker les SVG dans le repo Git (retirer du `.gitignore`) et faire un `mc mirror` depuis le dossier local du Pi après `git pull` :

```bash
# Dans deploy.sh après git pull
docker cp apps/worker/storage/drapeaux/. memoo-minio:/tmp/flags/
docker exec memoo-minio mc mirror /tmp/flags/ myminio/memolist-flags/
```
