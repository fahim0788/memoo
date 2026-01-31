# Scripts de déploiement

Ce répertoire contient les scripts pour déployer l'application Memoo sur un Raspberry Pi.

## 📁 Fichiers

### `build-and-push.sh`
**Où l'exécuter :** Sur votre machine locale (Windows avec WSL/Git Bash)

**Ce qu'il fait :**
1. Génère le fichier `.env` depuis `config.json`
2. Build les images Docker pour ARM64 (Raspberry Pi)
3. Sauvegarde les images en fichiers .tar
4. Transfère TOUT vers le Pi :
   - Images Docker
   - `.env` (généré automatiquement)
   - `docker-compose.prod.yml`
   - Scripts de déploiement
   - Configuration Nginx
5. Charge les images sur le Pi
6. Rend les scripts exécutables

**Usage :**
```bash
./scripts/build-and-push.sh [config.json]
```

**Prérequis :**
- Docker avec buildx
- jq installé (`apt install jq` sur WSL)
- Accès SSH au Raspberry Pi
- Fichier `config.json` configuré

**Note :** Depuis la v2, ce script génère automatiquement le `.env` - vous n'avez plus besoin de l'éditer manuellement sur le Pi !

---

### `initial-setup.sh`
**Où l'exécuter :** Sur le Raspberry Pi (via SSH)

**Ce qu'il fait :**
1. Vérifie les prérequis (`.env`, `docker-compose.prod.yml`)
2. Sauvegarde la configuration Nginx actuelle
3. Arrête les anciens conteneurs
4. Arrête et désactive Nginx global
5. Démarre la base de données
6. Exécute les migrations Prisma
7. Démarre tous les services Docker

**Usage :**
```bash
./scripts/initial-setup.sh
```

**⚠️ À exécuter UNE SEULE FOIS lors de la migration initiale**

**Prérequis :**
- `build-and-push.sh` déjà exécuté
- Fichier `.env` transféré (automatique)
- Images Docker chargées (automatique)

---

### `deploy.sh`
**Où l'exécuter :** Sur le Raspberry Pi (via SSH)

**Ce qu'il fait :**
1. Backup automatique de la base de données
2. Charge les nouvelles images Docker (si présentes)
3. Exécute les migrations Prisma
4. Redémarre les services
5. Vérifie la santé de l'API

**Usage :**
```bash
# Déploiement complet (backup + migrations)
./scripts/deploy.sh

# Sans backup
./scripts/deploy.sh --skip-backup

# Sans migrations
./scripts/deploy.sh --skip-migrations

# Sans backup ni migrations (déploiement rapide)
./scripts/deploy.sh --skip-backup --skip-migrations
```

**Prérequis :**
- Setup initial complété
- Nouvelles images transférées via `build-and-push.sh`

---

### `generate-secrets.sh`
**Où l'exécuter :** Sur votre machine locale

**Ce qu'il fait :**
- Génère des secrets aléatoires sécurisés (32-48 caractères)
- Affiche le format pour `config.json` et `.env`

**Usage :**
```bash
./scripts/generate-secrets.sh
```

Copiez les secrets générés dans votre `config.json`.

---

## 🚀 Workflow complet

### Déploiement initial (première fois)

**1. Sur votre PC Windows :**
```bash
# Générer des secrets sécurisés
bash scripts/generate-secrets.sh

# Créer et remplir la configuration
cp config.example.json config.json
nano config.json  # Coller les secrets générés

# Build et transférer TOUT
bash scripts/build-and-push.sh
```

**2. Sur le Raspberry Pi :**
```bash
# Se connecter
ssh fahim@192.168.1.187

# Aller dans le répertoire (créé automatiquement)
cd ~/memoo

# Migration complète
./scripts/initial-setup.sh
```

### Mises à jour quotidiennes

**1. Sur votre PC :**
```bash
# Modifier le code, puis
git add .
git commit -m "Updates"
git push  # Optionnel

# Build et transférer
bash scripts/build-and-push.sh
```

**2. Sur le Pi :**
```bash
ssh fahim@192.168.1.187
cd ~/memoo
./scripts/deploy.sh
```

---

## 📝 Configuration

### config.json (PC local - REQUIS)
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
    "password": "votre_mot_de_passe_securise"
  },
  "security": {
    "jwt_secret": "votre_secret_jwt_32_chars_minimum"
  },
  "ssl": {
    "enabled": true,
    "email": "votre-email@example.com"
  }
}
```

### .env (Raspberry Pi - AUTO-GÉNÉRÉ)
**Note :** Depuis la v2, ce fichier est généré automatiquement par `build-and-push.sh` depuis `config.json`. Vous n'avez plus besoin de l'éditer manuellement !

Format généré :
```bash
# Auto-généré depuis config.json
DOMAIN=memoo.fr
POSTGRES_DB=memolist
POSTGRES_USER=memolist
POSTGRES_PASSWORD=<depuis config.json>
DATABASE_URL=postgresql://memolist:<password>@db:5432/memolist
JWT_SECRET=<depuis config.json>
CORS_ORIGIN=https://memoo.fr
NODE_ENV=production
```

---

## 🎯 Différences clés v2 (sans Git sur Pi)

| Aspect | Ancienne méthode | Nouvelle méthode v2 |
|--------|------------------|---------------------|
| **Git sur Pi** | ✅ Requis | ❌ Non requis |
| **Édition .env** | ✅ Manuelle | ❌ Auto-généré |
| **Build** | Sur le Pi (lent) | Sur PC (rapide) |
| **Transfert** | Images seulement | Images + config + scripts |
| **Complexité** | Moyenne | Simple |

**Avantages v2 :**
- ✅ Pi = Simple runner Docker
- ✅ Pas d'édition manuelle de .env
- ✅ Configuration centralisée dans config.json
- ✅ Build rapide sur PC (pas sur le Pi ARM lent)
- ✅ Moins d'étapes, moins d'erreurs

---

## 🛠️ Dépannage

### Erreur "buildx not found"
```bash
docker buildx install
docker buildx create --name multiarch --use
```

### Erreur "jq not found"
```bash
# Sur WSL/Linux
sudo apt install jq

# Sur macOS
brew install jq
```

### Erreur SSH / Permission denied
```bash
# Tester la connexion
ssh fahim@192.168.1.187

# Configurer les clés SSH (recommandé)
ssh-keygen -t ed25519
ssh-copy-id fahim@192.168.1.187
```

### Le .env n'est pas généré
Vérifiez que `config.json` est bien formaté :
```bash
# Valider le JSON
cat config.json | jq .
```

### Les images ne se transfèrent pas
```bash
# Vérifier l'espace disque sur le Pi
ssh fahim@192.168.1.187 "df -h"

# Les images font ~500MB-1GB chacune
```

---

## 📚 Documentation complète

- [QUICKSTART.md](../QUICKSTART.md) - Guide rapide
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guide complet détaillé
