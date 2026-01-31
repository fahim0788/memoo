# Guide de Déploiement - Memoo

Guide complet pour déployer l'application Memoo sur un Raspberry Pi avec Docker.

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

### Principe clé: PC build, Pi run

```
┌─────────────────────────────────────────────────────────────┐
│                    PC Windows (Build)                        │
├─────────────────────────────────────────────────────────────┤
│  1. config.json       → Configuration centralisée           │
│  2. Docker buildx     → Build images ARM64                  │
│  3. Génération .env   → Depuis config.json                  │
│  4. SCP transfert     → Tout vers le Pi                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ SSH + SCP
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Raspberry Pi (Docker Runner)                    │
├─────────────────────────────────────────────────────────────┤
│  1. .env              → Auto-généré, pas d'édition          │
│  2. Images Docker     → Reçues du PC                        │
│  3. docker-compose    → Lance les 4 conteneurs              │
│  4. Nginx + SSL       → Reverse proxy HTTPS                 │
└─────────────────────────────────────────────────────────────┘
```

### Les 4 conteneurs Docker

1. **nginx** - Reverse proxy avec SSL/HTTPS
2. **web** - Frontend Next.js (PWA)
3. **api** - Backend Next.js + Prisma
4. **db** - PostgreSQL 16

---

## 🔧 Prérequis

### Sur votre PC Windows

**Logiciels requis:**
- Git Bash ou WSL (Windows Subsystem for Linux)
- Docker Desktop avec buildx activé
- jq (`apt install jq` sur WSL)
- Client SSH (inclus dans Windows 10+)

**Vérifier buildx:**
```bash
docker buildx version
# Si absent: docker buildx install
```

### Sur le Raspberry Pi

**Système:**
- Raspbian/Debian OS
- Docker installé
- docker-compose installé
- Accès SSH configuré

**Installation Docker (si absent):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install docker-compose
```

**Certificats SSL (optionnel mais recommandé):**
- Certbot installé
- Certificats Let's Encrypt pour votre domaine

---

## 🚀 Migration initiale

Cette section explique comment migrer de votre configuration actuelle vers Docker full-stack.

### Étape 1: Préparer la configuration sur PC

**1.1. Générer des secrets sécurisés**

```bash
bash scripts/generate-secrets.sh
```

Cela génère:
- Un mot de passe PostgreSQL (32 caractères)
- Un secret JWT (48 caractères)

**Copiez ces valeurs** - vous en aurez besoin dans config.json.

**1.2. Créer config.json**

```bash
cp config.example.json config.json
nano config.json
```

**Remplir les valeurs:**

```json
{
  "project": {
    "name": "memoo",
    "domain": "memoo.fr"
  },
  "pi": {
    "host": "192.168.1.187",
    "user": "fahim",
    "path": "/home/fahim/memoo"
  },
  "database": {
    "name": "memolist",
    "user": "memolist",
    "password": "COLLEZ_LE_PASSWORD_GÉNÉRÉ_ICI"
  },
  "security": {
    "jwt_secret": "COLLEZ_LE_JWT_SECRET_GÉNÉRÉ_ICI"
  },
  "ssl": {
    "enabled": true,
    "email": "votre-email@example.com"
  }
}
```

**⚠️ IMPORTANT:**
- Ne jamais commiter `config.json` dans Git (déjà dans .gitignore)
- Utiliser des secrets générés aléatoirement (jamais de valeurs faibles)

**1.3. Build et transfert**

```bash
bash scripts/build-and-push.sh
```

**Ce script fait TOUT automatiquement:**
1. ✅ Lit config.json
2. ✅ Génère le fichier .env pour le Pi
3. ✅ Build les images Docker pour ARM64
4. ✅ Sauvegarde les images en .tar
5. ✅ Transfère vers le Pi:
   - Images Docker
   - Fichier .env (généré)
   - docker-compose.prod.yml
   - Scripts
   - Config Nginx
6. ✅ Charge les images sur le Pi
7. ✅ Rend les scripts exécutables

**Durée:** 15-30 minutes selon votre connexion et PC.

---

### Étape 2: Migration sur le Raspberry Pi

**2.1. Se connecter au Pi**

```bash
ssh fahim@192.168.1.187
```

**2.2. Aller dans le répertoire**

```bash
cd ~/memoo
```

Le répertoire a été créé automatiquement par `build-and-push.sh`.

**2.3. Vérifier les fichiers transférés**

```bash
ls -la
```

Vous devez voir:
- `.env` (généré automatiquement)
- `docker-compose.prod.yml`
- `scripts/`
- `infra/nginx/`

**2.4. Lancer la migration**

```bash
./scripts/initial-setup.sh
```

**Ce script va:**
1. ✅ Vérifier les prérequis
2. ✅ Sauvegarder la config Nginx actuelle
3. ✅ Arrêter l'ancien conteneur web
4. ✅ Arrêter et désactiver Nginx global
5. ✅ Démarrer PostgreSQL
6. ✅ Exécuter les migrations Prisma
7. ✅ Démarrer tous les conteneurs

**⚠️ Attention:** Nginx global sera arrêté - votre site sera brièvement hors ligne (< 1 minute).

**Durée:** 5-10 minutes.

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

Doit retourner: `{"ok":true,"time":...}`

**3.3. Tester le site**

Ouvrez https://memoo.fr dans votre navigateur.

**3.4. Voir les logs**

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**✅ Si tout fonctionne:** Migration réussie !

**❌ Si problème:** Voir la section [Dépannage](#dépannage).

---

## 🔄 Déploiement quotidien

Pour déployer une mise à jour de l'application.

### Sur votre PC

```bash
# 1. Modifier le code
# ... faites vos modifications ...

# 2. Commiter (optionnel, pour Git)
git add .
git commit -m "Description des changements"
git push

# 3. Build et transfert
bash scripts/build-and-push.sh
```

### Sur le Raspberry Pi

```bash
# 1. Se connecter
ssh fahim@192.168.1.187
cd ~/memoo

# 2. Déployer
./scripts/deploy.sh
```

**Durée totale:** 5-10 minutes.

### Options de déploiement

```bash
# Déploiement complet (défaut)
# - Backup DB
# - Migrations
# - Redémarrage
./scripts/deploy.sh

# Sans backup (plus rapide)
./scripts/deploy.sh --skip-backup

# Sans migrations
./scripts/deploy.sh --skip-migrations

# Sans backup ni migrations (très rapide)
./scripts/deploy.sh --skip-backup --skip-migrations
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

```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker-compose.prod.yml ps db

# Voir les logs de la DB
docker-compose -f docker-compose.prod.yml logs db

# Redémarrer la base
docker-compose -f docker-compose.prod.yml restart db

# Attendre 30 secondes
sleep 30

# Redémarrer l'API
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

# Redémarrer l'API
docker-compose -f docker-compose.prod.yml restart api

# Health check local
docker-compose -f docker-compose.prod.yml exec api curl http://localhost:3000/api/health
```

### Restaurer Nginx global (rollback complet)

En cas de problème majeur:

```bash
# Arrêter Docker
docker-compose -f docker-compose.prod.yml down

# Restaurer Nginx global
sudo systemctl start nginx
sudo systemctl enable nginx
```

Le backup Nginx est dans `~/nginx-backup-YYYYMMDD-HHMMSS/`.

### Le .env n'est pas généré correctement

```bash
# Sur le PC, vérifier config.json
cat config.json | jq .

# Si erreur JSON, corriger et relancer
bash scripts/build-and-push.sh
```

### Erreur lors du build

```bash
# Vérifier buildx
docker buildx version

# Créer le builder
docker buildx create --name multiarch --use

# Nettoyer le cache Docker
docker builder prune

# Relancer le build
bash scripts/build-and-push.sh
```

---

## 🔐 Sécurité et backups

### Secrets et variables

**⚠️ Règles de sécurité:**
- Ne JAMAIS commiter `config.json` ou `.env`
- Utiliser des mots de passe de 32+ caractères aléatoires
- Changer tous les secrets par défaut en production
- Utiliser le générateur de secrets fourni

**Génération de secrets:**
```bash
bash scripts/generate-secrets.sh
```

### Backups automatiques

Les backups de la base sont créés automatiquement lors de chaque déploiement dans `~/memoo/backups/`.

**Rotation:** Les 7 derniers backups sont conservés.

**Localisation:**
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

**Images Docker:**
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

**Système:**
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 📊 Monitoring

### Health checks

```bash
# API
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

1. PC: Générer secrets → Créer config.json → `bash scripts/build-and-push.sh`
2. Pi: `cd ~/memoo` → `./scripts/initial-setup.sh`
3. Vérifier: `curl https://memoo.fr/api/health`

### Déploiement quotidien

1. PC: Modifier code → `bash scripts/build-and-push.sh`
2. Pi: `cd ~/memoo` → `./scripts/deploy.sh`

---

**🎉 Votre application est maintenant déployée avec Docker !**

Pour un guide rapide, consultez [QUICKSTART.md](QUICKSTART.md).
