# 🚀 Quick Start - Déploiement Memoo avec Git

Guide rapide pour déployer sur votre Raspberry Pi avec Git et build local.

## 📋 Prérequis

**Sur votre PC :**
- Git installé
- Accès SSH au Pi
- Repo Git (GitHub, GitLab, etc.)

**Sur le Raspberry Pi :**
- Debian/Raspbian
- Docker + docker-compose
- Git installé
- Certificats SSL Let's Encrypt (optionnel)

---

## 🎯 Déploiement initial (première fois)

### 1️⃣ Sur votre PC Windows

**Pusher le code vers Git :**

```bash
# Initialiser Git (si pas encore fait)
git init
git remote add origin https://github.com/votre-username/memolist-mvp.git

# Pousser le code
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2️⃣ Sur le Raspberry Pi

**Se connecter :**

```bash
ssh fahim@192.168.1.187
```

**Cloner et configurer :**

```bash
# Cloner le repo
cd ~
git clone https://github.com/votre-username/memolist-mvp.git memoo
cd memoo

# Créer le fichier .env
cp .env.production.example .env
nano .env  # Remplir avec vos valeurs

# Lancer la migration
./scripts/initial-setup.sh
```

**⏱️ Durée : 20-40 minutes (build Docker sur Pi)**

### 3️⃣ Vérifier

```bash
# Voir l'état
docker-compose -f docker-compose.prod.yml ps

# Tester
curl https://memoo.fr/api/health
```

✅ **Terminé ! Votre application est en ligne sur https://memoo.fr**

---

## 🔄 Mises à jour quotidiennes

### Sur votre PC

```bash
# Modifier le code, puis
git add .
git commit -m "Updates"
git push
```

### Sur le Pi

```bash
ssh fahim@192.168.1.187
cd ~/memoo
./scripts/deploy.sh
```

**C'est tout ! Le script fait automatiquement :**
- ✅ Git pull
- ✅ Rebuild des images
- ✅ Migrations DB
- ✅ Redémarrage

**⏱️ Durée : 15-30 minutes**

---

## 🛠️ Commandes utiles

```bash
# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f api

# Redémarrer
docker-compose -f docker-compose.prod.yml restart

# Voir l'état
docker-compose -f docker-compose.prod.yml ps

# Backup manuel de la DB
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U memolist memolist > backup.sql
```

---

## 🔧 Options de déploiement

### Déploiement complet (défaut)
```bash
./scripts/deploy.sh
# Backup + Git pull + Rebuild + Migrations + Restart
```

### Sans rebuild (plus rapide si pas de changement code)
```bash
./scripts/deploy.sh --skip-build
# Backup + Git pull + Migrations + Restart
```

### Sans backup
```bash
./scripts/deploy.sh --skip-backup
```

### Déploiement minimal
```bash
./scripts/deploy.sh --skip-backup --skip-migrations --skip-build
# Juste Git pull + Restart
```

---

## 🆘 Problème ?

```bash
# Voir les logs
docker-compose -f docker-compose.prod.yml logs

# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart api

# Restaurer Nginx global (rollback)
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📐 Architecture

```
PC Windows                    GitHub                    Raspberry Pi
    ↓                           ↓                           ↓
Modifier code  →  git push  →  Repository  →  git pull  →  Build local ARM
                                                          →  Docker compose up
```

**Le Pi = Build + Run Docker**
- ✅ Git pull pour récupérer le code
- ✅ Build natif ARM (pas besoin de buildx)
- ✅ Docker compose pour orchestrer
- ❌ Pas de transfert d'images (tout se build sur place)

---

## 🎯 Résumé ultra-rapide

**Migration initiale :**
1. PC : `git push`
2. Pi : `git clone` → `nano .env` → `./scripts/initial-setup.sh`

**Mises à jour :**
1. PC : `git push`
2. Pi : `./scripts/deploy.sh`

---

**📖 Guide complet : [DEPLOYMENT.md](DEPLOYMENT.md)**
