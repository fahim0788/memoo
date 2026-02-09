#!/bin/bash
# =============================================================================
# Script de déploiement avec Git
# À exécuter sur le Raspberry Pi après git push
# Usage: ./scripts/deploy.sh [--skip-backup] [--skip-migrations] [--skip-build]
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

CURRENT_STEP=0
TOTAL_STEPS=6

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    PROGRESS=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}[${CURRENT_STEP}/${TOTAL_STEPS}] ${MAGENTA}$1${NC} ${CYAN}(${PROGRESS}%)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# Arguments
# =============================================================================

SKIP_BACKUP=false
SKIP_MIGRATIONS=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            log_error "Argument inconnu: $1"
            echo "Usage: $0 [--skip-backup] [--skip-migrations] [--skip-build]"
            exit 1
            ;;
    esac
done

# =============================================================================
# Vérifications
# =============================================================================

log_step "Vérifications préliminaires"

if [ ! -f ".env" ]; then
    log_error "Fichier .env introuvable!"
    log_warn "Exécutez d'abord ./scripts/initial-setup.sh"
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "Fichier docker-compose.prod.yml introuvable!"
    exit 1
fi

if [ ! -d ".git" ]; then
    log_error "Pas de repository Git trouvé!"
    exit 1
fi

source .env
log_info "Configuration chargée depuis .env"

# =============================================================================
# Backup de la base de données
# =============================================================================

if [ "$SKIP_BACKUP" = false ]; then
    log_step "Sauvegarde de la base de données"

    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

    log_info "Création du backup: $BACKUP_FILE"
    docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > "$BACKUP_FILE" 2>/dev/null || {
        log_warn "Impossible de créer le backup (la base n'est peut-être pas démarrée)"
    }

    if [ -f "$BACKUP_FILE" ]; then
        log_info "Backup créé ($(du -h "$BACKUP_FILE" | cut -f1))"

        # Garder seulement les 7 derniers backups
        log_info "Nettoyage des anciens backups..."
        ls -t "$BACKUP_DIR"/db-backup-*.sql 2>/dev/null | tail -n +8 | xargs -r rm
        log_info "Anciens backups nettoyés (gardés 7 derniers)"
    fi
else
    log_warn "Backup de la base de données ignoré (--skip-backup)"
fi

# =============================================================================
# Pull du code depuis Git
# =============================================================================

log_step "Mise à jour du code depuis Git"

log_info "Pull des dernières modifications..."
git pull

log_info "Code mis à jour"

# =============================================================================
# Rebuild des images Docker
# =============================================================================

if [ "$SKIP_BUILD" = false ]; then
    log_step "Construction des images Docker"

    log_info "Build de l'image WEB (peut prendre 10-20 minutes)..."
    docker build --no-cache -t memoo-web:latest -f apps/web/Dockerfile \
        --build-arg NEXT_PUBLIC_API_BASE=/api \
        --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-MemoList}" .

    log_info "Build de l'image API..."
    docker build --no-cache -t memoo-api:latest -f apps/api/Dockerfile .

    log_info "Build de l'image WORKER..."
    docker build --no-cache -t memoo-worker:latest -f apps/worker/Dockerfile .

    log_info "Images rebuildées avec succès"
else
    log_warn "Rebuild des images ignoré (--skip-build)"
fi

# =============================================================================
# Migrations de base de données
# =============================================================================

if [ "$SKIP_MIGRATIONS" = false ]; then
    log_step "Migrations de la base de données"

    log_info "Attente du démarrage de la base de données..."
    sleep 5

    log_info "Exécution des migrations Prisma..."
    docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma

    log_info "Exécution du seed..."
    docker-compose -f docker-compose.prod.yml exec -T api npx prisma db seed --schema=packages/db/prisma/schema.prisma || {
        log_warn "Seed ignoré (la base est peut-être déjà seeded)"
    }

    log_info "Migrations et seed appliqués"
else
    log_warn "Migrations de base de données ignorées (--skip-migrations)"
fi

# =============================================================================
# Redémarrage des services
# =============================================================================

log_step "Démarrage des services"

log_info "Redémarrage des conteneurs..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate

log_info "Attente du démarrage (10s)..."
sleep 10

# Vérifier l'état
log_info ""
log_info "État des conteneurs:"
docker-compose -f docker-compose.prod.yml ps

# =============================================================================
# Health check
# =============================================================================

log_info ""
log_info "Vérification de santé de l'API..."

# Essayer sur HTTPS d'abord, puis HTTP si échec
if curl -sf https://${DOMAIN}/api/health > /dev/null 2>&1; then
    log_info "✓ API en ligne (HTTPS)"
elif curl -sf http://localhost/api/health > /dev/null 2>&1; then
    log_info "✓ API en ligne (HTTP local)"
else
    log_warn "⚠️  API ne répond pas encore (peut prendre quelques secondes)"
fi

# =============================================================================
# Fin
# =============================================================================

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}   ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Application:${NC} https://${DOMAIN}"
echo ""
echo -e "${CYAN}Commandes utiles:${NC}"
echo -e "  ${YELLOW}Voir les logs${NC}          docker-compose -f docker-compose.prod.yml logs -f"
echo -e "  ${YELLOW}Logs d'un service${NC}     docker-compose -f docker-compose.prod.yml logs -f api"
echo -e "  ${YELLOW}Redémarrer un service${NC} docker-compose -f docker-compose.prod.yml restart web"
echo -e "  ${YELLOW}Voir l'état${NC}           docker-compose -f docker-compose.prod.yml ps"
echo ""
if [ "$SKIP_BACKUP" = false ] && [ -f "$BACKUP_FILE" ]; then
    echo -e "${CYAN}Backup de la base:${NC} $BACKUP_FILE"
    echo -e "  ${YELLOW}Restaurer${NC}: cat $BACKUP_FILE | docker-compose -f docker-compose.prod.yml exec -T db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
    echo ""
fi
