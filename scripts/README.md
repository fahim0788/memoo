# Scripts de déploiement

Ce répertoire contient les scripts pour déployer l'application Memoo sur un Raspberry Pi via Git.

## 📁 Fichiers

### `push-to-git.sh`
**Où l'exécuter :** Sur votre PC (via Git Bash ou WSL)

**Ce qu'il fait :**
1. `git add .` — stage tous les fichiers modifiés
2. `git commit` avec le message fourni en argument
3. `git push` vers le remote

**Usage :**
```bash
bash scripts/push-to-git.sh "message de commit"
```

Si aucun message n'est fourni, utilise `"Update code"` par défaut.

---

### `initial-setup.sh`
**Où l'exécuter :** Sur le Raspberry Pi (via SSH) — **UNE SEULE FOIS**

**Ce qu'il fait :**
1. Vérifie les prérequis (Docker, docker-compose, Git)
2. Clone le repository Git (si une URL est fournie en argument)
3. Vérifie que `.env` existe, sinon copie `.env.production.example` et demande de l'éditer
4. Sauvegarde la configuration Nginx actuelle
5. Arrête les anciens conteneurs memoo
6. Arrête et désactive Nginx global
7. Build les images Docker localement (WEB + API)
8. Démarre PostgreSQL et exécute les migrations Prisma
9. Démarre tous les services Docker

**Usage :**
```bash
# Si le repo est déjà cloné (vous êtes dans le répertoire)
bash ./scripts/initial-setup.sh

# Pour cloner depuis une URL Git
bash ./scripts/initial-setup.sh https://github.com/user/memolist-mvp.git
```

**⚠️ Ne pas utiliser `sudo`** — le script gère les commandes nécessitant sudo en interne.

**Prérequis :**
- Docker, docker-compose et Git installés
- User dans le groupe `docker`
- Fichier `.env` configuré (voir `.env.production.example`)

---

### `deploy.sh`
**Où l'exécuter :** Sur le Raspberry Pi (via SSH) — à chaque mise à jour

**Ce qu'il fait :**
1. Backup automatique de la base de données
2. `git pull` des dernières modifications
3. Rebuild des images Docker (WEB + API)
4. Exécution des migrations Prisma
5. Redémarrage des conteneurs (`--force-recreate`)
6. Health check de l'API

**Usage :**
```bash
# Déploiement complet (défaut)
bash ./scripts/deploy.sh

# Sans backup
bash ./scripts/deploy.sh --skip-backup

# Sans rebuild (plus rapide si pas de changement de code)
bash ./scripts/deploy.sh --skip-build

# Sans migrations
bash ./scripts/deploy.sh --skip-migrations

# Déploiement minimal (juste git pull + restart)
bash ./scripts/deploy.sh --skip-backup --skip-migrations --skip-build
```

**Prérequis :**
- Setup initial complété (`initial-setup.sh` déjà exécuté)
- Code pushé vers Git depuis le PC

---

### `generate-secrets.sh`
**Où l'exécuter :** Sur votre machine locale

**Ce qu'il fait :**
- Génère des secrets aléatoires sécurisés (mot de passe PostgreSQL 32 chars, JWT secret 48 chars)
- Affiche les valeurs à copier dans votre fichier `.env`

**Usage :**
```bash
bash scripts/generate-secrets.sh
```

Copiez les secrets générés dans le fichier `.env` sur le Raspberry Pi.

---

## 🚀 Workflow complet

### Déploiement initial (première fois)

**1. Sur votre PC :**
```bash
# Générer des secrets sécurisés
bash scripts/generate-secrets.sh

# Pousser le code vers Git
bash scripts/push-to-git.sh "Initial commit"
```

**2. Sur le Raspberry Pi :**
```bash
ssh fahim@192.168.1.187
cd ~

# Cloner le repo et lancer la migration
git clone https://github.com/votre-username/memolist-mvp.git memoo
cd memoo
cp .env.production.example .env
nano .env  # Coller les secrets générés
bash ./scripts/initial-setup.sh
```

### Mises à jour quotidiennes

**1. Sur votre PC :**
```bash
# Modifier le code, puis
bash scripts/push-to-git.sh "Description des changements"
```

**2. Sur le Pi :**
```bash
ssh fahim@192.168.1.187
cd ~/memoo
bash ./scripts/deploy.sh
```

---

## 📝 Configuration

### .env (Raspberry Pi — à éditer manuellement)

Créé depuis `.env.production.example` :

```bash
DOMAIN=memoo.fr
POSTGRES_DB=memolist
POSTGRES_USER=memolist
POSTGRES_PASSWORD=votre_mot_de_passe_securise
DATABASE_URL=postgresql://memolist:votre_mot_de_passe_securise@db:5432/memolist
JWT_SECRET=votre_secret_jwt_32_chars_minimum
CORS_ORIGIN=https://memoo.fr
NODE_ENV=production
```

**⚠️ Important :** `DATABASE_URL` doit contenir les valeurs littérales — docker-compose ne résout pas les variables `${}` entre elles dans un fichier `.env`.

---

## 🛠️ Dépannage

### "command not found" sur les scripts
```bash
# Toujours utiliser bash explicitement
bash ./scripts/initial-setup.sh
bash ./scripts/deploy.sh
```

### "Permission denied" avec Docker
```bash
sudo usermod -aG docker fahim
# Déconnecter et reconnecter via SSH
exit
ssh fahim@192.168.1.187
```

### docker-compose n'est pas installé
```bash
sudo apt update
sudo apt install -y docker-compose
```

### Erreur DATABASE_URL lors des migrations Prisma
Vérifie que `.env` ne contient pas de variables `${}` dans `DATABASE_URL` :
```bash
cat .env | grep DATABASE_URL
# Correct :   postgresql://memolist:motdepasse@db:5432/memolist
# Incorrect : postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

### npx demande d'installer Prisma pendant les migrations
C'est normal. Le conteneur API n'a pas Prisma en cache la première fois. Confirmez avec `y` et attendez la fin de l'installation.

---

## 📚 Documentation complète

- [QUICKSTART.md](../QUICKSTART.md) - Guide rapide
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guide complet détaillé
