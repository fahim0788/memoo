# Guide de Déploiement - Memoo

Guide complet pour déployer l'application Memoo sur un Raspberry Pi avec Git et Docker.

## 📋 Table des matières

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Migration initiale](#migration-initiale)
4. [Déploiement quotidien](#déploiement-quotidien)
5. [Commandes utiles](#commandes-utiles)
6. [Dépannage](#dépannage)
7. [Sécurité et backups](#sécurité-et-backups)

---

## 🏗️ Architecture

### Principe clé: PC push vers Git, Pi pull et build

```
┌─────────────────────────────────────────────────────────────┐
│                    PC Windows (Dev)                          │
├─────────────────────────────────────────────────────────────┤
│  1. Modifier le code                                        │
│  2. git push vers GitHub/GitLab                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Git (HTTPS)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Raspberry Pi (Build + Run)                      │
├─────────────────────────────────────────────────────────────┤
│  1. git pull           → Récupère le code                   │
│  2. docker build       → Build les images ARM64 localement  │
│  3. prisma migrate     → Met à jour la base de données      │
│  4. docker-compose up  → Lance les conteneurs               │
│  5. Nginx + SSL        → Reverse proxy HTTPS                │
└─────────────────────────────────────────────────────────────┘
```

### Les 6 conteneurs Docker

1. **nginx** - Reverse proxy avec SSL/HTTPS (ports 80, 443)
2. **web** - Frontend Next.js (port 3000 interne)
3. **api** - Backend Next.js + Prisma (port 3001 interne)
4. **worker** - Worker TTS pour génération audio (background)
5. **db** - PostgreSQL 16 (port 5432 interne)
6. **minio** - Stockage objet S3 (ports 9000 API, 9001 Console)

Tous les conteneurs sont sur le réseau Docker `memoo-network`. Seuls nginx et minio exposent des ports vers l'extérieur.

---

## 🔧 Prérequis

### Sur votre PC Windows

- Git installé et configuré
- Accès SSH au Pi (client SSH inclus dans Windows 10+)
- Un compte Git distant (GitHub, GitLab, etc.)

### Sur le Raspberry Pi

**Système :**
- Raspbian/Debian OS
- Docker installé
- docker-compose installé
- Git installé
- Votre user dans le groupe `docker`

**Installation (si absent) :**
```bash
sudo apt update
sudo apt install -y docker docker-compose git
sudo usermod -aG docker $USER
# Déconnectez-vous et reconnectez-vous pour appliquer le groupe docker
```

**Certificats SSL (optionnel mais recommandé) :**
- Certbot installé
- Certificats Let's Encrypt pour votre domaine (`/etc/letsencrypt/`)

---

## 🚀 Migration initiale

Cette section explique comment migrer vers Docker full-stack avec build local sur le Pi.

### Étape 1: Préparer le code sur PC

**1.1. Vérifier que le code est pushé vers Git**

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

**1.2. Générer des secrets sécurisés**

```bash
bash scripts/generate-secrets.sh
```

Cela génère un mot de passe PostgreSQL (32 caractères) et un secret JWT (48 caractères). **Gardez ces valeurs** — vous les entrerez dans le fichier `.env` sur le Pi.

---

### Étape 2: Configuration sur le Raspberry Pi

**2.1. Se connecter au Pi**

```bash
ssh fahim@192.168.1.187
```

**2.2. Cloner le repository**

```bash
cd ~
git clone https://github.com/votre-username/memolist-mvp.git memoo
cd memoo
```

**2.3. Créer et éditer le fichier `.env`**

```bash
cp .env.production.example .env
nano .env
```

Remplissez les valeurs avec les secrets générés à l'étape 1.2 :

```bash
# Domaine et base de données
DOMAIN=memoo.fr
POSTGRES_DB=memolist
POSTGRES_USER=memolist
POSTGRES_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE
DATABASE_URL=postgresql://memolist:VOTRE_MOT_DE_PASSE_SECURISE@db:5432/memolist
JWT_SECRET=VOTRE_SECRET_JWT_MIN_32_CHARS
CORS_ORIGIN=https://memoo.fr
NODE_ENV=production

# OpenAI (pour la génération audio TTS)
OPENAI_API_KEY=sk-...

# Storage TTS (MinIO)
STORAGE_TYPE=minio
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=VOTRE_ACCESS_KEY_SECURISE
MINIO_SECRET_KEY=VOTRE_SECRET_KEY_SECURISE
MINIO_BUCKET=memolist-tts
```

**⚠️ IMPORTANT :**
- `DATABASE_URL` doit contenir les **mêmes valeurs** que `POSTGRES_USER` et `POSTGRES_PASSWORD` — pas de variables `${}` !
- `OPENAI_API_KEY` est nécessaire pour la génération audio (worker TTS)
- `MINIO_ACCESS_KEY` et `MINIO_SECRET_KEY` doivent être sécurisés (min. 16 caractères)
- Ne jamais commiter le fichier `.env`

**2.4. Lancer la migration**

```bash
bash ./scripts/initial-setup.sh
```

**⚠️ Ne pas utiliser `sudo`** — le script gère lui-même les commandes qui nécessitent sudo (comme nginx).

**Ce script va :**
1. ✅ Vérifier les prérequis (Docker, docker-compose, Git)
2. ✅ Vérifier que `.env` existe
3. ✅ Sauvegarder la config Nginx actuelle
4. ✅ Arrêter les anciens conteneurs memoo
5. ✅ Arrêter et désactiver Nginx global
6. ✅ Build les images Docker localement (WEB + API)
7. ✅ Démarrer PostgreSQL et exécuter les migrations Prisma
8. ✅ Démarrer tous les conteneurs

**Durée :** 20-40 minutes (build Docker sur Pi ARM).

---

### Étape 3: Vérification

**3.1. Voir l'état des conteneurs**

```bash
docker-compose -f docker-compose.prod.yml ps
```

Tous les conteneurs doivent être "Up".

**3.2. Tester l'API**

```bash
curl https://memoo.fr/api/health
```

Doit retourner : `{"ok":true,"time":...}`

**3.3. Tester le site**

Ouvrez https://memoo.fr dans votre navigateur.

**3.4. Voir les logs**

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**✅ Si tout fonctionne :** Migration réussie !

**❌ Si problème :** Voir la section [Dépannage](#dépannage).

---

## 🔄 Déploiement quotidien

Pour déployer une mise à jour de l'application.

### Sur votre PC

```bash
# 1. Modifier le code
# ... faites vos modifications ...

# 2. Pousser vers Git
git add .
git commit -m "Description des changements"
git push
```

### Sur le Raspberry Pi

```bash
# 1. Se connecter
ssh fahim@192.168.1.187
cd ~/memoo

# 2. Déployer
bash ./scripts/deploy.sh
```

**Ce script fait automatiquement :**
1. ✅ Backup de la base de données
2. ✅ `git pull` des dernières modifications
3. ✅ Rebuild des images Docker
4. ✅ Migrations Prisma
5. ✅ Redémarrage des conteneurs
6. ✅ Health check

**Durée :** 15-30 minutes (selon le build Docker).

### Options de déploiement

```bash
# Déploiement complet (défaut)
bash ./scripts/deploy.sh

# Sans backup (plus rapide)
bash ./scripts/deploy.sh --skip-backup

# Sans rebuild (si pas de changement de code)
bash ./scripts/deploy.sh --skip-build

# Sans migrations (si pas de changement de schéma DB)
bash ./scripts/deploy.sh --skip-migrations

# Déploiement minimal (juste git pull + restart)
bash ./scripts/deploy.sh --skip-backup --skip-migrations --skip-build
```

---

## 🛠️ Commandes utiles

### Gestion des conteneurs

```bash
# Voir l'état
docker-compose -f docker-compose.prod.yml ps

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web

# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart api

# Redémarrer tout
docker-compose -f docker-compose.prod.yml restart

# Arrêter tout
docker-compose -f docker-compose.prod.yml down

# Démarrer tout
docker-compose -f docker-compose.prod.yml up -d
```

### Gestion de la base de données

```bash
# Se connecter à la DB
docker-compose -f docker-compose.prod.yml exec db psql -U memolist -d memolist

# Créer un backup manuel
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U memolist memolist > backup.sql

# Restaurer un backup
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U memolist -d memolist

# Voir les tables
docker-compose -f docker-compose.prod.yml exec db psql -U memolist -d memolist -c "\dt"
```

### Nettoyage

```bash
# Supprimer les images inutilisées
docker image prune -a

# Voir l'espace disque
docker system df

# Nettoyage complet (ATTENTION: supprime tout ce qui n'est pas utilisé)
docker system prune -a --volumes
```

---

## 🔍 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Voir les logs complets
docker-compose -f docker-compose.prod.yml logs

# Voir l'état détaillé
docker-compose -f docker-compose.prod.yml ps

# Redémarrer en force
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Erreur de connexion à la base de données

Vérifie que `DATABASE_URL` dans `.env` utilise des valeurs littérales, pas des variables `${}` :

```bash
# Vérifier le contenu du .env
cat .env | grep DATABASE_URL
# Correct :   DATABASE_URL=postgresql://memolist:motdepasse@db:5432/memolist
# Incorrect : DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker-compose.prod.yml ps db

# Voir les logs de la DB
docker-compose -f docker-compose.prod.yml logs db

# Redémarrer la base
docker-compose -f docker-compose.prod.yml restart db

# Attendre 30 secondes, puis redémarrer l'API
sleep 30
docker-compose -f docker-compose.prod.yml restart api
```

### Problème SSL/HTTPS

```bash
# Vérifier les certificats
sudo ls -la /etc/letsencrypt/live/memoo.fr/

# Renouveler les certificats
sudo certbot renew

# Redémarrer nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### L'API ne répond pas

```bash
# Logs de l'API
docker-compose -f docker-compose.prod.yml logs api

# Vérifier les variables d'environnement
docker-compose -f docker-compose.prod.yml exec api env | grep DATABASE

# Health check local
docker-compose -f docker-compose.prod.yml exec api curl http://localhost:3000/api/health

# Redémarrer l'API
docker-compose -f docker-compose.prod.yml restart api
```

### Erreur lors du build Docker

```bash
# Voir les logs détaillés du build
docker build -t memoo-web:latest -f apps/web/Dockerfile apps/web 2>&1 | tail -50

# Nettoyer le cache Docker
docker builder prune

# Vérifier l'espace disque (le Pi peut manquer de place)
df -h
docker system df
```

### "Permission denied" avec Docker

```bash
sudo usermod -aG docker fahim
# Déconnecter et reconnecter via SSH
exit
ssh fahim@192.168.1.187
```

### Restaurer Nginx global (rollback complet)

En cas de problème majeur :

```bash
# Arrêter Docker
docker-compose -f docker-compose.prod.yml down

# Restaurer Nginx global
sudo systemctl start nginx
sudo systemctl enable nginx
```

Le backup Nginx est dans `~/nginx-backup-YYYYMMDD-HHMMSS/`.

---

## 🔐 Sécurité et backups

### Secrets et variables

**⚠️ Règles de sécurité :**
- Ne JAMAIS commiter `.env` dans Git (déjà dans .gitignore)
- Utiliser des mots de passe de 32+ caractères aléatoires
- Changer tous les secrets par défaut avant la mise en production
- Utiliser le générateur de secrets fourni

**Génération de secrets :**
```bash
bash scripts/generate-secrets.sh
```

### Backups automatiques

Les backups de la base sont créés automatiquement lors de chaque déploiement dans `~/memoo/backups/`.

**Rotation :** Les 7 derniers backups sont conservés automatiquement.

```bash
ls -lh ~/memoo/backups/
```

### Backups manuels

```bash
# Backup complet
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U memolist memolist > backup-$(date +%Y%m%d).sql

# Compresser
gzip backup-$(date +%Y%m%d).sql

# Transférer vers votre PC
scp fahim@192.168.1.187:~/memoo/backup-*.sql.gz ./
```

### Restauration d'un backup

```bash
# Depuis un fichier .sql
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U memolist -d memolist

# Depuis un fichier .sql.gz
gunzip -c backup.sql.gz | docker-compose -f docker-compose.prod.yml exec -T db psql -U memolist -d memolist
```

### Mises à jour de sécurité

**Images Docker (base PostgreSQL) :**
```bash
docker-compose -f docker-compose.prod.yml pull db
docker-compose -f docker-compose.prod.yml up -d db
```

**Système :**
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 📊 Monitoring

### Health checks

```bash
# API via HTTPS
curl https://memoo.fr/api/health

# Logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# Ressources utilisées
docker stats
```

### Espace disque

```bash
# Espace total
df -h

# Espace Docker
docker system df

# Nettoyer si nécessaire
docker system prune -a
```

---

## 🎯 Récapitulatif

### Migration initiale (une fois)

1. PC : `git push`
2. Pi : `git clone` → `nano .env` → `bash ./scripts/initial-setup.sh`
3. Vérifier : `curl https://memoo.fr/api/health`

### Déploiement quotidien

1. PC : Modifier code → `git push`
2. Pi : `bash ./scripts/deploy.sh`

---

**Pour un guide rapide, consultez [QUICKSTART.md](QUICKSTART.md).**
