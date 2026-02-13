# Guide de Déploiement des Fichiers TTS vers MinIO

Ce guide explique comment copier les fichiers MP3 générés localement vers MinIO en production.

## Contexte

Les fichiers MP3 TTS sont générés localement par le worker et doivent être déployés sur le serveur de production dans MinIO pour être accessibles via les URLs du type `https://memoo.fr/storage/tts/XXX.mp3`.

## Prérequis

- Accès SSH au serveur de production (Raspberry Pi ARM64)
- Fichiers MP3 générés dans `apps/worker/storage/tts/` localement
- MinIO configuré et en cours d'exécution sur le serveur

## Important : Architecture ARM64

Le serveur de production est un Raspberry Pi (ARM64). Utilisez les binaires ARM64, pas AMD64.

## Étapes de Déploiement

### 1. Copier les fichiers depuis local vers le serveur

**Sur votre machine locale (Windows PowerShell) :**

```powershell
# Copier tous les fichiers MP3 vers le serveur
scp -r apps\worker\storage\tts\* fahim@192.168.1.187:/tmp/tts-files/
```

### 2. Se connecter au serveur

```bash
ssh fahim@192.168.1.187
cd /var/www/memoo
```

### 3. Copier les fichiers dans le volume MinIO

```bash
# Trouver le chemin du volume MinIO (normalement /var/lib/docker/volumes/memoo_minio-data/_data)
docker volume inspect memoo_minio-data | grep Mountpoint

# Créer le répertoire tts si nécessaire
sudo mkdir -p /var/lib/docker/volumes/memoo_minio-data/_data/tts

# Copier les fichiers dans le volume
sudo cp -r /tmp/tts-files/* /var/lib/docker/volumes/memoo_minio-data/_data/tts/

# Vérifier la copie
sudo ls -lh /var/lib/docker/volumes/memoo_minio-data/_data/tts/ | head -20

# Nettoyer le répertoire temporaire
rm -rf /tmp/tts-files
```

### 4. Configurer MinIO

#### 4.1 Vérifier les credentials MinIO

```bash
# Les credentials sont dans le .env
grep -E "MINIO_ROOT|MINIO_ACCESS|MINIO_SECRET" .env
```

Les credentials par défaut sont :
- Access Key: `CHANGE_ME_MINIO_ACCESS_KEY`
- Secret Key: `CHANGE_ME_MINIO_SECRET_KEY`

#### 4.2 Configurer l'alias MinIO

```bash
# Configurer l'alias avec les bons credentials
docker exec memoo-minio mc alias set myminio http://localhost:9000 CHANGE_ME_MINIO_ACCESS_KEY CHANGE_ME_MINIO_SECRET_KEY
```

#### 4.3 Créer le bucket et le rendre public

```bash
# Créer le bucket tts (si pas déjà fait)
docker exec memoo-minio mc mb myminio/tts 2>/dev/null || echo "Bucket existe déjà"

# Rendre le bucket public en lecture
docker exec memoo-minio mc anonymous set download myminio/tts
```

### 5. Installer mc dans le worker et uploader

```bash
# Installer mc dans le worker (ARM64 pour Raspberry Pi)
docker exec memoo-worker-1 sh -c "wget --no-check-certificate https://dl.min.io/client/mc/release/linux-arm64/mc -O /tmp/mc && chmod +x /tmp/mc"

# Récupérer l'IP de MinIO
docker inspect memoo-minio --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
# Exemple: 172.24.0.7

# Configurer l'alias avec l'IP
docker exec memoo-worker-1 /tmp/mc alias set myminio http://IP_MINIO:9000 CHANGE_ME_MINIO_ACCESS_KEY CHANGE_ME_MINIO_SECRET_KEY

# Copier les fichiers MP3 dans le worker
docker cp /tmp/tts-files/. memoo-worker-1:/tmp/tts-upload/

# Uploader vers MinIO avec mc mirror
docker exec memoo-worker-1 /tmp/mc mirror /tmp/tts-upload/ myminio/tts/

# Vérifier que les fichiers sont bien uploadés
docker exec memoo-minio mc ls myminio/tts/ | head -20
```

### 6. Tester l'accès aux fichiers

```bash
# Test depuis le serveur (API MinIO)
curl -I http://localhost:9000/tts/2_en.mp3

# Vous devriez voir : HTTP/1.1 200 OK
# Si vous voyez 403 Forbidden : le bucket n'est pas public (retour étape 4.3)
# Si vous voyez 404 Not Found : les fichiers ne sont pas uploadés (retour étape 5)
```

### 7. Configurer Nginx pour router /storage/tts/ vers MinIO

**Éditer `infra/nginx/nginx.conf` :**

```nginx
# Ajouter cette location dans le bloc server
location /storage/tts/ {
    rewrite ^/storage/tts/(.*)$ /tts/$1 break;
    proxy_pass http://minio:9000;
    proxy_set_header Host minio:9000;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Redémarrer nginx :**

```bash
docker compose restart nginx
```

### 8. Vérification finale

```bash
# Test depuis le serveur via nginx
curl -I http://localhost/storage/tts/2_en.mp3

# Test depuis l'extérieur
curl -I http://192.168.1.187/storage/tts/2_en.mp3

# Ou ouvrir dans un navigateur :
# http://192.168.1.187/storage/tts/2_en.mp3
```

## Dépannage

### Problème de réseau Docker (conteneurs ne communiquent pas)

Si MinIO n'est pas accessible depuis le worker :

```bash
# Vérifier sur quels réseaux sont les conteneurs
docker inspect memoo-worker-1 | grep -A 10 Networks
docker inspect memoo-minio | grep -A 10 Networks

# Si MinIO n'est pas sur memoo_default, le connecter
docker network connect memoo_default memoo-minio

# Récupérer l'IP de MinIO
docker inspect memoo-minio --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Utiliser le hostname Docker (ne PAS utiliser d'IP directe, elle change à chaque restart)
docker exec memoo-worker-1 /tmp/mc alias set myminio http://minio:9000 ACCESS_KEY SECRET_KEY
```

### Les fichiers retournent 403 Forbidden

Le bucket n'est pas public. Exécutez :
```bash
docker exec memoo-minio mc anonymous set download myminio/tts
```

### Les fichiers retournent 404 Not Found

Les fichiers ne sont pas dans MinIO. Vérifiez :
```bash
# Vérifier que les fichiers sont dans le volume
sudo ls /var/lib/docker/volumes/memoo_minio-data/_data/tts/

# Vérifier que les fichiers sont dans MinIO
docker exec memoo-minio mc ls myminio/tts/

# Si le bucket est vide, ré-uploadez
docker exec memoo-minio sh -c "cd /data/tts && mc cp --recursive . myminio/tts/"
```

### MinIO ne répond pas

Vérifiez que le conteneur est en cours d'exécution :
```bash
docker ps | grep minio
docker compose logs minio --tail 50
```

### Erreur de credentials MinIO

Les credentials par défaut ne fonctionnent pas. Vérifiez dans le .env et utilisez les bons :
```bash
grep MINIO .env
docker exec memoo-minio mc alias set myminio http://localhost:9000 VOTRE_ACCESS_KEY VOTRE_SECRET_KEY
```

## Notes Importantes

1. **Sécurité** : Changez les credentials MinIO par défaut en production
2. **Performance** : Pour un grand nombre de fichiers, utilisez `mc mirror` au lieu de `mc cp`
3. **Backup** : Sauvegardez régulièrement le volume MinIO
4. **Monitoring** : Surveillez l'espace disque du volume MinIO

## Commandes Utiles

```bash
# Lister tous les buckets
docker exec memoo-minio mc ls myminio/

# Compter les fichiers dans le bucket
docker exec memoo-minio mc ls myminio/tts/ | wc -l

# Vérifier l'espace utilisé
docker exec memoo-minio mc du myminio/tts/

# Supprimer un fichier
docker exec memoo-minio mc rm myminio/tts/FICHIER.mp3

# Vider tout le bucket (attention !)
docker exec memoo-minio mc rm --recursive --force myminio/tts/
```
