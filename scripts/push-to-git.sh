#!/bin/bash
# =============================================================================
# Script simple pour pousser le code vers Git
# Usage: ./scripts/push-to-git.sh "message de commit"
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

COMMIT_MSG="${1:-Update code}"

log_step "Push vers Git"

# Vérifier si on est dans un repo Git
if [ ! -d ".git" ]; then
    log_error "Pas de repo Git trouvé"
    log_info "Initialisez Git avec: git init && git remote add origin <url>"
    exit 1
fi

# Ajouter tous les fichiers
log_info "Ajout des fichiers modifiés..."
git add .

# Vérifier s'il y a des changements
if git diff --staged --quiet; then
    log_warn "Aucun changement à commiter"
    exit 0
fi

# Commiter
log_info "Commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Pousser
log_info "Push vers le repo distant..."
git push

log_info ""
log_info "========================================="
log_info "   ✓ CODE POUSSE VERS GIT"
log_info "========================================="
log_info ""
log_info "Prochaine étape sur le Raspberry Pi:"
log_info "  ssh fahim@192.168.1.187"
log_info "  cd ~/memoo"
log_info "  ./scripts/deploy.sh"
log_info ""
