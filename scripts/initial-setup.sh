#!/bin/bash
# =============================================================================
# Setup initial - Migration vers Docker full-stack avec Git
# À exécuter UNE SEULE FOIS sur le Raspberry Pi
# Usage: ./scripts/initial-setup.sh <git-repo-url>
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[ETAPE]${NC} $1"; }

GIT_REPO_URL="${1}"

# =============================================================================
# Vérifications préliminaires
# =============================================================================

log_step "1/9 - Vérifications préliminaires"

if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose n'est pas installé"
    exit 1
fi

if ! command -v git &> /dev/null; then
    log_error "Git n'est pas installé"
    log_info "Installez avec: sudo apt install git"
    exit 1
fi

log_info "✓ Tous les prérequis sont présents"

# =============================================================================
# Cloner le repository Git
# =============================================================================

log_step "2/9 - Clonage du repository Git"

if [ -z "$GIT_REPO_URL" ]; then
    if [ ! -d ".git" ]; then
        log_error "URL du repo Git manquante"
        log_info "Usage: $0 <git-repo-url>"
        log_info "Exemple: $0 https://github.com/user/memolist-mvp.git"
        exit 1
    else
        log_info "Repository Git déjà présent"
    fi
else
    log_info "Clonage depuis $GIT_REPO_URL..."
    cd ~
    rm -rf memoo
    git clone "$GIT_REPO_URL" memoo
    cd memoo
    log_info "✓ Repository cloné"
fi

# =============================================================================
# Créer le fichier .env
# =============================================================================

log_step "3/9 - Configuration du fichier .env"

if [ ! -f ".env" ]; then
    log_warn "Fichier .env introuvable"
    log_info "Création depuis .env.production.example..."

    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env
        log_warn "⚠️  IMPORTANT: Éditez .env avec vos vraies valeurs:"
        log_info "  nano .env"
        log_info ""
        log_info "Puis relancez ce script"
        exit 1
    else
        log_error "Aucun fichier .env.production.example trouvé"
        exit 1
    fi
else
    log_info "✓ Fichier .env présent"
fi

# Charger les variables
source .env

log_info "  - Domaine: $DOMAIN"
log_info "  - Base de données: $POSTGRES_DB"

# =============================================================================
# Sauvegarder la configuration Nginx actuelle
# =============================================================================

log_step "4/9 - Sauvegarde de la configuration Nginx actuelle"

BACKUP_DIR="$HOME/nginx-backup-$(date +%Y%m%d-%H%M%S)"
log_info "Création du backup dans: $BACKUP_DIR"

sudo mkdir -p "$BACKUP_DIR"
sudo cp -r /etc/nginx "$BACKUP_DIR/" 2>/dev/null || log_warn "Nginx config non trouvée"
sudo cp -r /etc/letsencrypt "$BACKUP_DIR/" 2>/dev/null || log_warn "Certificats SSL non trouvés"

log_info "✓ Backup créé: $BACKUP_DIR"

# =============================================================================
# Arrêter les anciens conteneurs
# =============================================================================

log_step "5/9 - Arrêt des anciens conteneurs"

RUNNING_CONTAINERS=$(docker ps -q --filter "name=memoo")

if [ -n "$RUNNING_CONTAINERS" ]; then
    log_info "Arrêt des conteneurs memoo existants..."
    docker stop $RUNNING_CONTAINERS || true
    docker rm $RUNNING_CONTAINERS || true
    log_info "✓ Anciens conteneurs arrêtés"
else
    log_warn "Aucun conteneur memoo en cours d'exécution"
fi

# =============================================================================
# Arrêter Nginx global
# =============================================================================

log_step "6/9 - Arrêt de Nginx global"

if sudo systemctl is-active --quiet nginx; then
    log_warn "⚠️  Nginx global va être arrêté - votre site sera brièvement hors ligne"
    log_info "Arrêt dans 5 secondes... (Ctrl+C pour annuler)"
    sleep 5

    sudo systemctl stop nginx
    sudo systemctl disable nginx
    log_info "✓ Nginx global arrêté et désactivé"
else
    log_info "Nginx global n'est pas actif"
fi

# =============================================================================
# Build des images Docker localement
# =============================================================================

log_step "7/9 - Build des images Docker (cela peut prendre 15-30 minutes)"

log_info "Build de l'image WEB..."
docker build -t memoo-web:latest -f apps/web/Dockerfile apps/web

log_info "Build de l'image API..."
docker build -t memoo-api:latest -f apps/api/Dockerfile apps/api

log_info "✓ Images buildées avec succès"

# =============================================================================
# Démarrer la base de données et exécuter les migrations
# =============================================================================

log_step "8/9 - Démarrage de la base de données et migrations"

log_info "Démarrage du conteneur PostgreSQL..."
docker-compose -f docker-compose.prod.yml up -d db

log_info "Attente du démarrage de la base de données (30s)..."
sleep 30

log_info "Exécution des migrations Prisma..."
docker-compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

log_info "✓ Base de données initialisée avec succès"

# =============================================================================
# Démarrer tous les services
# =============================================================================

log_step "9/9 - Démarrage de tous les services Docker"

log_info "Démarrage de tous les conteneurs..."
docker-compose -f docker-compose.prod.yml up -d

log_info "Attente du démarrage complet (10s)..."
sleep 10

# Vérifier l'état des conteneurs
log_info ""
log_info "État des conteneurs:"
docker-compose -f docker-compose.prod.yml ps

# =============================================================================
# Vérifications post-déploiement
# =============================================================================

log_info ""
log_info "========================================="
log_info "   ✅ MIGRATION TERMINÉE AVEC SUCCÈS"
log_info "========================================="
log_info ""
log_info "Services démarrés:"
log_info "  ✓ Nginx:      HTTPS reverse proxy"
log_info "  ✓ Web:        Next.js frontend"
log_info "  ✓ API:        Next.js backend + Prisma"
log_info "  ✓ Database:   PostgreSQL 16"
log_info ""
log_info "Accès:"
log_info "  - Production: https://$DOMAIN"
log_info "  - API Health: https://$DOMAIN/api/health"
log_info ""
log_info "Backup Nginx: $BACKUP_DIR"
log_info ""
log_info "Commandes utiles:"
log_info "  - Voir les logs:     docker-compose -f docker-compose.prod.yml logs -f"
log_info "  - Redémarrer:        docker-compose -f docker-compose.prod.yml restart"
log_info "  - Déployer update:   ./scripts/deploy.sh"
log_info ""
log_warn "Si problème, pour restaurer Nginx global:"
log_info "  sudo systemctl start nginx && sudo systemctl enable nginx"
log_info ""
