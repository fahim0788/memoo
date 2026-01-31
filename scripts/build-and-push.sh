#!/bin/bash
# =============================================================================
# Build local et déploiement complet vers le Raspberry Pi
# Usage: ./scripts/build-and-push.sh [config.json]
# =============================================================================

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[ÉTAPE]${NC} $1"; }

# =============================================================================
# 1. Charger la configuration
# =============================================================================

log_step "1/7 - Chargement de la configuration"

CONFIG_FILE="${1:-config.json}"

if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Fichier de configuration introuvable: $CONFIG_FILE"
    log_info "Créez-le à partir de config.example.json"
    exit 1
fi

# Lecture des variables depuis le JSON
PI_HOST=$(jq -r '.pi.host' "$CONFIG_FILE")
PI_USER=$(jq -r '.pi.user' "$CONFIG_FILE")
PI_PATH=$(jq -r '.pi.path' "$CONFIG_FILE")
PROJECT_NAME=$(jq -r '.project.name' "$CONFIG_FILE")
DOMAIN=$(jq -r '.project.domain' "$CONFIG_FILE")
DB_NAME=$(jq -r '.database.name' "$CONFIG_FILE")
DB_USER=$(jq -r '.database.user' "$CONFIG_FILE")
DB_PASSWORD=$(jq -r '.database.password' "$CONFIG_FILE")
JWT_SECRET=$(jq -r '.security.jwt_secret' "$CONFIG_FILE")

log_info "✓ Configuration chargée"
log_info "  - Pi: $PI_USER@$PI_HOST"
log_info "  - Domaine: $DOMAIN"

# =============================================================================
# 2. Générer le fichier .env pour le Pi
# =============================================================================

log_step "2/7 - Génération du fichier .env"

TEMP_DIR=$(mktemp -d)
ENV_FILE="$TEMP_DIR/.env"

cat > "$ENV_FILE" << EOF
# =============================================================================
# Configuration de production - Auto-généré depuis config.json
# Généré le: $(date)
# =============================================================================

# Domaine
DOMAIN=$DOMAIN

# Base de données PostgreSQL
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# Connection string pour Prisma
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@db:5432/$DB_NAME

# JWT Secret
JWT_SECRET=$JWT_SECRET

# CORS Origin
CORS_ORIGIN=https://$DOMAIN

# Next.js
NODE_ENV=production
EOF

log_info "✓ Fichier .env généré"

# =============================================================================
# 3. Build des images Docker pour ARM64 (Raspberry Pi)
# =============================================================================

log_step "3/7 - Build des images Docker pour ARM64"

# Vérifier si buildx est disponible
if ! docker buildx version &> /dev/null; then
    log_error "docker buildx n'est pas disponible"
    log_info "Installation: docker buildx install"
    exit 1
fi

# Créer un builder multi-plateforme si nécessaire
if ! docker buildx inspect multiarch &> /dev/null; then
    log_info "Création du builder multi-plateforme..."
    docker buildx create --name multiarch --use
fi

docker buildx use multiarch

# Build de l'image WEB pour ARM64
log_info "Build de l'image WEB (ARM64)..."
docker buildx build \
    --platform linux/arm64 \
    --tag ${PROJECT_NAME}-web:latest \
    --load \
    -f apps/web/Dockerfile \
    apps/web

# Build de l'image API pour ARM64
log_info "Build de l'image API (ARM64)..."
docker buildx build \
    --platform linux/arm64 \
    --tag ${PROJECT_NAME}-api:latest \
    --load \
    -f apps/api/Dockerfile \
    apps/api

log_info "✓ Images buildées avec succès"

# =============================================================================
# 4. Sauvegarder les images en fichiers .tar
# =============================================================================

log_step "4/7 - Sauvegarde des images"

docker save ${PROJECT_NAME}-web:latest -o "$TEMP_DIR/web.tar"
docker save ${PROJECT_NAME}-api:latest -o "$TEMP_DIR/api.tar"

log_info "✓ Images sauvegardées ($(du -sh "$TEMP_DIR"/*.tar | awk '{print $1}' | paste -sd '+' -))"

# =============================================================================
# 5. Préparer les fichiers de configuration
# =============================================================================

log_step "5/7 - Préparation des fichiers de configuration"

# Copier docker-compose.prod.yml et les scripts
cp docker-compose.prod.yml "$TEMP_DIR/"
cp -r scripts "$TEMP_DIR/"
cp -r infra "$TEMP_DIR/"

log_info "✓ Fichiers de configuration préparés"

# =============================================================================
# 6. Créer le répertoire sur le Pi et transférer
# =============================================================================

log_step "6/7 - Transfert vers le Raspberry Pi"

# Créer la structure de répertoires sur le Pi
ssh ${PI_USER}@${PI_HOST} "mkdir -p ${PI_PATH}/{images,backups,scripts,infra/nginx}"

log_info "Transfert du fichier .env..."
scp "$ENV_FILE" ${PI_USER}@${PI_HOST}:${PI_PATH}/.env

log_info "Transfert de docker-compose.prod.yml..."
scp "$TEMP_DIR/docker-compose.prod.yml" ${PI_USER}@${PI_HOST}:${PI_PATH}/

log_info "Transfert des scripts..."
scp -r "$TEMP_DIR/scripts/"* ${PI_USER}@${PI_HOST}:${PI_PATH}/scripts/

log_info "Transfert de la config Nginx..."
scp "$TEMP_DIR/infra/nginx/nginx.prod.conf" ${PI_USER}@${PI_HOST}:${PI_PATH}/infra/nginx/

log_info "Transfert des images Docker (cela peut prendre du temps)..."
scp "$TEMP_DIR/web.tar" "$TEMP_DIR/api.tar" ${PI_USER}@${PI_HOST}:${PI_PATH}/images/

log_info "✓ Tous les fichiers transférés"

# =============================================================================
# 7. Charger les images et rendre les scripts exécutables
# =============================================================================

log_step "7/7 - Configuration finale sur le Pi"

ssh ${PI_USER}@${PI_HOST} << 'EOF'
    cd ${PI_PATH}

    # Charger les images Docker
    echo "Chargement des images..."
    docker load -i images/web.tar
    docker load -i images/api.tar

    # Nettoyer les fichiers .tar
    rm -f images/web.tar images/api.tar

    # Rendre les scripts exécutables
    chmod +x scripts/*.sh

    echo "✓ Configuration terminée"
EOF

log_info "✓ Images chargées et scripts configurés"

# =============================================================================
# Nettoyage local
# =============================================================================

log_info "Nettoyage local..."
rm -rf "$TEMP_DIR"

# =============================================================================
# Résumé
# =============================================================================

echo ""
log_info "========================================="
log_info "   ✅ BUILD ET TRANSFERT TERMINÉS"
log_info "========================================="
echo ""
log_info "Fichiers transférés vers $PI_USER@$PI_HOST:$PI_PATH:"
log_info "  - .env (auto-généré depuis config.json)"
log_info "  - docker-compose.prod.yml"
log_info "  - Images Docker: ${PROJECT_NAME}-web, ${PROJECT_NAME}-api"
log_info "  - Scripts de déploiement"
log_info "  - Configuration Nginx"
echo ""
log_info "Prochaines étapes:"
log_info "  1. Connexion: ssh ${PI_USER}@${PI_HOST}"
log_info "  2. Aller dans: cd ${PI_PATH}"
log_info "  3. Migration initiale: ./scripts/initial-setup.sh"
log_info "     OU"
log_info "     Déploiement: ./scripts/deploy.sh"
echo ""
