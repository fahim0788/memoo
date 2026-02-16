#!/bin/bash
# =============================================================================
# MemoList — Script de déploiement production
#
# Usage: ./scripts/deploy.sh [options]
#
# Options:
#   --only=<tâche>     Exécuter une seule tâche
#                      Tâches: backup, pull, build, migrate, deploy, health
#   --skip-backup      Ignorer la sauvegarde DB
#   --skip-build       Ignorer la construction des images
#   --skip-migrate     Ignorer les migrations
#   --retry=<n>        Nombre de tentatives réseau (défaut: 3)
#   --help             Afficher cette aide
#
# Exemples:
#   ./scripts/deploy.sh                  # Déploiement complet
#   ./scripts/deploy.sh --only=migrate   # Uniquement les migrations
#   ./scripts/deploy.sh --only=build     # Uniquement la construction
#   ./scripts/deploy.sh --only=health    # Vérifier la santé
#   ./scripts/deploy.sh --skip-backup    # Sans sauvegarde
# =============================================================================

set -e

# =============================================================================
# Couleurs et constantes
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

COMPOSE_FILE="docker-compose.prod.yml"
MAX_RETRIES=3
ONLY_TASK=""
SKIP_BACKUP=false
SKIP_BUILD=false
SKIP_MIGRATE=false
INTERACTIVE=false
[ -t 1 ] && INTERACTIVE=true

# =============================================================================
# Fonctions utilitaires
# =============================================================================

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --only=<tâche>     Exécuter une seule tâche"
    echo "                     Tâches: backup, pull, build, migrate, deploy, health"
    echo "  --skip-backup      Ignorer la sauvegarde DB"
    echo "  --skip-build       Ignorer la construction des images"
    echo "  --skip-migrate     Ignorer les migrations"
    echo "  --retry=<n>        Nombre de tentatives réseau (défaut: 3)"
    echo "  --help             Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                     # Déploiement complet"
    echo "  $0 --only=migrate      # Uniquement les migrations"
    echo "  $0 --only=build        # Uniquement la construction"
    echo "  $0 --skip-backup       # Sans sauvegarde"
    exit 0
}

format_time() {
    local secs=$1
    if [ "$secs" -ge 60 ]; then
        printf "%dm%02ds" $((secs / 60)) $((secs % 60))
    else
        printf "%ds" "$secs"
    fi
}

log_ok() { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "  ${RED}✗${NC} $1"; }

# Exécute une commande avec spinner animé et chrono
# Usage: spin "message" commande args...
spin() {
    local msg="$1"
    shift
    local logfile="/tmp/deploy-$$.log"
    local start_time
    start_time=$(date +%s)

    # Run command in background
    "$@" > "$logfile" 2>&1 &
    local pid=$!

    if [ "$INTERACTIVE" = true ]; then
        local frames='|/-\'
        local i=0
        while kill -0 "$pid" 2>/dev/null; do
            local elapsed=$(( $(date +%s) - start_time ))
            local ch="${frames:$((i % 4)):1}"
            printf "\r  ${CYAN}%s${NC} %-45s ${DIM}%s${NC}" "$ch" "$msg" "$(format_time $elapsed)"
            i=$((i + 1))
            sleep 0.15
        done
    else
        # Non-interactif : log simple
        echo -n "  ... $msg"
        wait "$pid" 2>/dev/null || true
    fi

    wait "$pid" 2>/dev/null
    local rc=$?
    local elapsed=$(( $(date +%s) - start_time ))

    if [ $rc -eq 0 ]; then
        if [ "$INTERACTIVE" = true ]; then
            printf "\r  ${GREEN}✓${NC} %-45s ${DIM}%s${NC}\n" "$msg" "$(format_time $elapsed)"
        else
            echo -e " ${GREEN}OK${NC} ($(format_time $elapsed))"
        fi
    else
        if [ "$INTERACTIVE" = true ]; then
            printf "\r  ${RED}✗${NC} %-45s ${DIM}%s${NC}\n" "$msg" "$(format_time $elapsed)"
        else
            echo -e " ${RED}FAIL${NC} ($(format_time $elapsed))"
        fi
        echo ""
        echo -e "  ${RED}Erreur:${NC}"
        tail -20 "$logfile" 2>/dev/null | sed 's/^/    /'
        echo ""
    fi

    rm -f "$logfile"
    return $rc
}

# Retry avec backoff exponentiel
# Usage: retry <max> "message" commande args...
retry() {
    local max=$1
    local msg="$2"
    shift 2

    for attempt in $(seq 1 "$max"); do
        if spin "$msg (tentative $attempt/$max)" "$@"; then
            return 0
        fi
        if [ "$attempt" -lt "$max" ]; then
            local delay=$((attempt * 5))
            log_warn "Échec tentative $attempt/$max. Nouvelle tentative dans ${delay}s..."
            sleep "$delay"
        fi
    done

    log_error "Échec définitif après $max tentatives: $msg"
    return 1
}

# Header de section avec barre de progression
section() {
    local step=$1
    local total=$2
    local title=$3
    local pct=$((step * 100 / total))

    # Barre de progression visuelle
    local filled=$((pct / 5))
    local empty=$((20 - filled))
    local bar=""
    local rest=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do rest+="░"; done

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}[${step}/${total}]${NC} ${MAGENTA}${title}${NC}"
    echo -e "  ${GREEN}${bar}${DIM}${rest}${NC} ${CYAN}${pct}%${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

should_run() {
    [ -z "$ONLY_TASK" ] || [ "$ONLY_TASK" = "$1" ]
}

# Attendre que la DB soit prête
wait_for_db() {
    echo -e "  ${CYAN}...${NC} Attente de la base de données"
    for i in $(seq 1 30); do
        if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "${POSTGRES_USER}" > /dev/null 2>&1; then
            log_ok "Base de données prête"
            return 0
        fi
        sleep 1
    done
    log_error "La base de données ne répond pas après 30s"
    return 1
}

# Vérifier qu'une image Docker existe
ensure_image() {
    local image=$1
    if ! docker image inspect "$image" > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Parse "Step X/Y" depuis un log docker build → retourne "current/total"
build_step() {
    local result
    result=$(grep -o 'Step [0-9]*/[0-9]*' "$1" 2>/dev/null | tail -1 | sed 's/Step //')
    echo "${result:-0/1}"
}

# Affiche une barre de progression
# Usage: render_bar "LABEL" current total status elapsed_secs
# status: -1=en cours, 0=ok, 1+=échoué
render_bar() {
    local label=$1 cur=$2 tot=$3 status=$4 elapsed=$5
    local w=20

    [ "$tot" -le 0 ] && tot=1
    [ "$cur" -gt "$tot" ] && cur=$tot

    local filled=$((cur * w / tot))
    local empty=$((w - filled))

    local bar="" rest=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do rest+="░"; done

    local icon=" " clr="${CYAN}"
    if [ "$status" -eq 0 ]; then
        icon="${GREEN}✓${NC}"; clr="${GREEN}"
        bar=""; for ((i=0; i<w; i++)); do bar+="█"; done; rest=""
        cur=$tot
    elif [ "$status" -gt 0 ]; then
        icon="${RED}✗${NC}"; clr="${RED}"
    fi

    printf "  %-8s %b%s${DIM}%s${NC} %2d/%-2d %b ${DIM}%s${NC}\n" \
        "$label" "$clr" "$bar" "$rest" "$cur" "$tot" "$icon" "$(format_time "$elapsed")"
}

# =============================================================================
# Arguments
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --only=*)
            ONLY_TASK="${1#*=}"
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        --retry=*)
            MAX_RETRIES="${1#*=}"
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            log_error "Argument inconnu: $1"
            echo "Utilisez --help pour l'aide"
            exit 1
            ;;
    esac
done

# Valider --only
if [ -n "$ONLY_TASK" ]; then
    case "$ONLY_TASK" in
        backup|pull|build|migrate|deploy|health) ;;
        *)
            log_error "Tâche inconnue: $ONLY_TASK"
            echo "Tâches: backup, pull, build, migrate, deploy, health"
            exit 1
            ;;
    esac
fi

# =============================================================================
# Vérifications préliminaires
# =============================================================================

echo ""
echo -e "  ${BOLD}${MAGENTA}MemoList${NC} ${DIM}— Déploiement production${NC}"
echo ""

if [ ! -f ".env" ]; then
    log_error "Fichier .env introuvable"
    log_warn "Exécutez d'abord ./scripts/initial-setup.sh"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Fichier $COMPOSE_FILE introuvable"
    exit 1
fi

# shellcheck source=/dev/null
source .env
log_ok "Configuration .env chargée"

# Calculer le nombre d'étapes
if [ -n "$ONLY_TASK" ]; then
    TOTAL=1
    STEP=0
else
    TOTAL=0
    [ "$SKIP_BACKUP" = false ] && TOTAL=$((TOTAL + 1))
    TOTAL=$((TOTAL + 1))  # pull
    [ "$SKIP_BUILD" = false ] && TOTAL=$((TOTAL + 1))
    [ "$SKIP_MIGRATE" = false ] && TOTAL=$((TOTAL + 1))
    TOTAL=$((TOTAL + 1))  # deploy
    TOTAL=$((TOTAL + 1))  # health
    STEP=0
fi

# =============================================================================
# 1. Backup
# =============================================================================

if should_run "backup" && [ "$SKIP_BACKUP" = false ]; then
    STEP=$((STEP + 1))
    section $STEP $TOTAL "Sauvegarde de la base de données"

    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

    if docker-compose -f "$COMPOSE_FILE" ps db 2>/dev/null | grep -q "running"; then
        docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$BACKUP_FILE" 2>/dev/null && {
            if [ -s "$BACKUP_FILE" ]; then
                log_ok "Backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
                # Garder les 7 derniers
                ls -t "$BACKUP_DIR"/db-backup-*.sql 2>/dev/null | tail -n +8 | xargs -r rm
                log_ok "Anciens backups nettoyés (7 derniers gardés)"
            else
                rm -f "$BACKUP_FILE"
                log_warn "Backup vide, supprimé"
            fi
        } || {
            rm -f "$BACKUP_FILE"
            log_warn "Backup impossible"
        }
    else
        log_warn "DB non démarrée, backup ignoré"
    fi
fi

# =============================================================================
# 2. Git Pull
# =============================================================================

if should_run "pull"; then
    STEP=$((STEP + 1))
    section $STEP $TOTAL "Mise à jour du code"

    retry "$MAX_RETRIES" "Git pull" git pull
fi

# =============================================================================
# 3. Build images Docker
# =============================================================================

if should_run "build" && [ "$SKIP_BUILD" = false ]; then
    STEP=$((STEP + 1))
    section $STEP $TOTAL "Construction des images Docker"

    # Builds en parallèle avec barres de progression
    BUILD_LOG_DIR="/tmp/deploy-build-$$"
    mkdir -p "$BUILD_LOG_DIR"

    export DOCKER_BUILDKIT=0

    docker build -t memoo-web:latest -f apps/web/Dockerfile \
        --build-arg NEXT_PUBLIC_API_BASE=/api \
        --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-MemoList}" . \
        > "$BUILD_LOG_DIR/web.log" 2>&1 &
    PID_WEB=$!

    docker build -t memoo-api:latest -f apps/api/Dockerfile . \
        > "$BUILD_LOG_DIR/api.log" 2>&1 &
    PID_API=$!

    docker build -t memoo-worker:latest -f apps/worker/Dockerfile . \
        > "$BUILD_LOG_DIR/worker.log" 2>&1 &
    PID_WORKER=$!

    RC_WEB=-1; RC_API=-1; RC_WORKER=-1
    BUILD_START=$(date +%s)

    if [ "$INTERACTIVE" = true ]; then
        tput civis 2>/dev/null || true
        echo ""; echo ""; echo ""

        while [ $RC_WEB -lt 0 ] || [ $RC_API -lt 0 ] || [ $RC_WORKER -lt 0 ]; do
            BUILD_ELAPSED=$(( $(date +%s) - BUILD_START ))

            # Collecter les exit codes quand un build finit
            if [ $RC_WEB -lt 0 ] && ! kill -0 "$PID_WEB" 2>/dev/null; then
                wait "$PID_WEB" 2>/dev/null && RC_WEB=0 || RC_WEB=$?
            fi
            if [ $RC_API -lt 0 ] && ! kill -0 "$PID_API" 2>/dev/null; then
                wait "$PID_API" 2>/dev/null && RC_API=0 || RC_API=$?
            fi
            if [ $RC_WORKER -lt 0 ] && ! kill -0 "$PID_WORKER" 2>/dev/null; then
                wait "$PID_WORKER" 2>/dev/null && RC_WORKER=0 || RC_WORKER=$?
            fi

            # Parser la progression
            STEP_WEB=$(build_step "$BUILD_LOG_DIR/web.log")
            STEP_API=$(build_step "$BUILD_LOG_DIR/api.log")
            STEP_WORKER=$(build_step "$BUILD_LOG_DIR/worker.log")

            # Remonter 3 lignes et redessiner
            printf "\033[3A"
            render_bar "WEB"    "${STEP_WEB%/*}" "${STEP_WEB#*/}" "$RC_WEB" "$BUILD_ELAPSED"
            render_bar "API"    "${STEP_API%/*}" "${STEP_API#*/}" "$RC_API" "$BUILD_ELAPSED"
            render_bar "WORKER" "${STEP_WORKER%/*}" "${STEP_WORKER#*/}" "$RC_WORKER" "$BUILD_ELAPSED"

            sleep 0.5
        done

        tput cnorm 2>/dev/null || true
    else
        echo "  ... Build WEB + API + WORKER en parallèle"
        wait "$PID_WEB" 2>/dev/null && RC_WEB=0 || RC_WEB=$?
        wait "$PID_API" 2>/dev/null && RC_API=0 || RC_API=$?
        wait "$PID_WORKER" 2>/dev/null && RC_WORKER=0 || RC_WORKER=$?
        BUILD_ELAPSED=$(( $(date +%s) - BUILD_START ))
    fi

    FAIL=0
    [ $RC_WEB -ne 0 ]    && { log_error "Build WEB échoué (voir $BUILD_LOG_DIR/web.log)"; FAIL=1; }
    [ $RC_API -ne 0 ]    && { log_error "Build API échoué (voir $BUILD_LOG_DIR/api.log)"; FAIL=1; }
    [ $RC_WORKER -ne 0 ] && { log_error "Build WORKER échoué (voir $BUILD_LOG_DIR/worker.log)"; FAIL=1; }

    if [ $FAIL -ne 0 ]; then
        log_error "Un ou plusieurs builds ont échoué. Logs dans $BUILD_LOG_DIR/"
        exit 1
    fi

    log_ok "Builds parallèles terminés ($(format_time $BUILD_ELAPSED))"
    rm -rf "$BUILD_LOG_DIR"

    # MIGRATE réutilise le cache du build API (quasi-instantané)
    retry "$MAX_RETRIES" "Build MIGRATE" \
        docker build --target migrate -t memoo-migrate:latest -f apps/api/Dockerfile .

    log_ok "Toutes les images construites"
fi

# =============================================================================
# 4. Migrations
# =============================================================================

if should_run "migrate" && [ "$SKIP_MIGRATE" = false ]; then
    STEP=$((STEP + 1))
    section $STEP $TOTAL "Migrations de la base de données"

    # S'assurer que l'image de migration existe
    if ! ensure_image "memoo-migrate:latest"; then
        log_warn "Image de migration introuvable, construction..."
        retry "$MAX_RETRIES" "Build MIGRATE" \
            docker build --target migrate -t memoo-migrate:latest -f apps/api/Dockerfile .
    fi

    # Démarrer la DB si nécessaire
    spin "Démarrage de la base de données" \
        docker-compose -f "$COMPOSE_FILE" up -d db

    wait_for_db

    # Exécuter les migrations via le conteneur dédié
    spin "Application des migrations Prisma" \
        docker-compose -f "$COMPOSE_FILE" --profile tools run --rm migrate

    log_ok "Migrations appliquées"
fi

# =============================================================================
# 5. Déploiement des services
# =============================================================================

if should_run "deploy"; then
    STEP=$((STEP + 1))
    section $STEP $TOTAL "Démarrage des services"

    spin "Redémarrage des conteneurs" \
        docker-compose -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans

    spin "Attente du démarrage" sleep 15

    echo ""
    echo -e "  ${CYAN}État des conteneurs:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
fi

# =============================================================================
# 6. Health check
# =============================================================================

if should_run "health"; then
    STEP=$((STEP + 1))
    section $STEP $TOTAL "Vérification de santé"

    HEALTH_OK=false

    for i in $(seq 1 15); do
        if curl -sf "https://${DOMAIN}/api/health" > /dev/null 2>&1; then
            log_ok "API en ligne (HTTPS)"
            HEALTH_OK=true
            break
        elif curl -sf "http://localhost/api/health" > /dev/null 2>&1; then
            log_ok "API en ligne (HTTP local)"
            HEALTH_OK=true
            break
        fi

        if [ "$INTERACTIVE" = true ]; then
            printf "\r  ${CYAN}|${NC} Tentative %d/15..." "$i"
        fi
        sleep 3
    done

    if [ "$INTERACTIVE" = true ] && [ "$HEALTH_OK" = false ]; then
        printf "\r"
    fi

    if [ "$HEALTH_OK" = false ]; then
        log_warn "API ne répond pas encore"
        log_warn "Vérifiez: docker-compose -f $COMPOSE_FILE logs -f api"
    fi
fi

# =============================================================================
# Résumé
# =============================================================================

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ -n "$ONLY_TASK" ]; then
    echo -e "${GREEN}${BOLD}   Tâche '${ONLY_TASK}' terminée${NC}"
else
    echo -e "${GREEN}${BOLD}   Déploiement terminé${NC}"
fi
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Application:${NC} https://${DOMAIN}"
echo ""
echo -e "  ${DIM}Commandes utiles:${NC}"
echo -e "  ${YELLOW}Logs${NC}        docker-compose -f $COMPOSE_FILE logs -f"
echo -e "  ${YELLOW}Logs API${NC}    docker-compose -f $COMPOSE_FILE logs -f api"
echo -e "  ${YELLOW}État${NC}        docker-compose -f $COMPOSE_FILE ps"
echo -e "  ${YELLOW}Migrate${NC}     $0 --only=migrate"
echo -e "  ${YELLOW}Health${NC}      $0 --only=health"
echo ""
if [ "$SKIP_BACKUP" = false ] && [ -n "${BACKUP_FILE:-}" ] && [ -f "${BACKUP_FILE:-}" ]; then
    echo -e "  ${CYAN}Dernier backup:${NC} $BACKUP_FILE"
    echo ""
fi
