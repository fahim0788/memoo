#!/bin/bash
# =============================================================================
# Scan de securite - Memoo
# Simule un bot qui cherche des failles sur le site public
#
# Usage: bash scripts/security-scan.sh [domain]
#   domain: domaine a scanner (defaut: memoo.fr)
# =============================================================================

DOMAIN="${1:-memoo.fr}"
BASE="https://$DOMAIN"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

ISSUES=0

check() {
    local label="$1"
    local path="$2"
    local expected="$3"
    local code
    code=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/$path")

    if [ "$expected" = "blocked" ]; then
        if [ "$code" = "404" ] || [ "$code" = "403" ]; then
            printf "  ${GREEN}✓${NC} %-45s %s\n" "$path" "$code"
        elif [ "$code" = "307" ] || [ "$code" = "308" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
            printf "  ${YELLOW}⚠${NC} %-45s %s (redirect, pas expose mais pas bloque)\n" "$path" "$code"
        else
            printf "  ${RED}✗${NC} %-45s %s ${RED}← ACCESSIBLE${NC}\n" "$path" "$code"
            ISSUES=$((ISSUES + 1))
        fi
    else
        if [ "$code" = "200" ]; then
            printf "  ${GREEN}✓${NC} %-45s %s\n" "$path" "$code"
        else
            printf "  ${YELLOW}⚠${NC} %-45s %s\n" "$path" "$code"
        fi
    fi
}

echo ""
echo -e "${BOLD}${CYAN}=== SCAN SECURITE $DOMAIN ===${NC}"

# --- Fichiers sensibles (doivent etre 403/404) ---
echo ""
echo -e "${BOLD}1. Fichiers sensibles (doivent etre bloques)${NC}"
for f in \
    .env .env.local .env.production .env.backup \
    .git/config .git/HEAD .gitignore \
    .htaccess .htpasswd .DS_Store \
    docker-compose.yml docker-compose.prod.yml \
    package.json package-lock.json pnpm-lock.yaml \
    tsconfig.json next.config.js next.config.mjs \
    prisma/schema.prisma \
    Dockerfile Dockerfile.prod \
    scripts/deploy.sh scripts/security-scan.sh \
    backups/ backup/ dumps/ \
    /server-status /server-info \
    wp-login.php wp-admin/ xmlrpc.php \
    phpmyadmin/ adminer.php \
    /.aws/credentials /.ssh/id_rsa
do
    check "sensible" "$f" "blocked"
done

# --- Assets publics (doivent etre 200) ---
echo ""
echo -e "${BOLD}2. Assets publics (doivent etre accessibles)${NC}"
for f in \
    favicon.png \
    manifest.webmanifest \
    sw.js \
    logo-light.svg logo-dark.svg
do
    check "public" "$f" "200"
done

# --- API endpoints ---
echo ""
echo -e "${BOLD}3. API endpoints${NC}"
for ep in \
    api/health \
    api/users \
    api/decks \
    api/auth/login \
    api/docs api/swagger api/graphql
do
    code=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/$ep")
    if [ "$ep" = "api/health" ]; then
        if [ "$code" = "200" ]; then
            printf "  ${GREEN}✓${NC} %-45s %s (public OK)\n" "$ep" "$code"
        else
            printf "  ${YELLOW}⚠${NC} %-45s %s\n" "$ep" "$code"
        fi
    elif [ "$ep" = "api/docs" ] || [ "$ep" = "api/swagger" ] || [ "$ep" = "api/graphql" ]; then
        if [ "$code" = "404" ] || [ "$code" = "403" ]; then
            printf "  ${GREEN}✓${NC} %-45s %s (non expose)\n" "$ep" "$code"
        else
            printf "  ${RED}✗${NC} %-45s %s ${RED}← EXPOSE${NC}\n" "$ep" "$code"
            ISSUES=$((ISSUES + 1))
        fi
    else
        if [ "$code" = "401" ] || [ "$code" = "403" ]; then
            printf "  ${GREEN}✓${NC} %-45s %s (protege)\n" "$ep" "$code"
        elif [ "$code" = "404" ]; then
            printf "  ${GREEN}✓${NC} %-45s %s\n" "$ep" "$code"
        else
            printf "  ${YELLOW}⚠${NC} %-45s %s (verifier auth)\n" "$ep" "$code"
        fi
    fi
done

# --- Headers de securite ---
echo ""
echo -e "${BOLD}4. Headers de securite${NC}"
HEADERS=$(curl -skI "$BASE/" 2>/dev/null)

check_header() {
    local name="$1"
    if echo "$HEADERS" | grep -qi "^$name:"; then
        local val
        val=$(echo "$HEADERS" | grep -i "^$name:" | head -1 | sed 's/\r//')
        printf "  ${GREEN}✓${NC} %s\n" "$val"
    else
        printf "  ${RED}✗${NC} %-45s ${RED}MANQUANT${NC}\n" "$name"
        ISSUES=$((ISSUES + 1))
    fi
}

check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "X-XSS-Protection"
check_header "Referrer-Policy"
check_header "Content-Security-Policy"

# --- Version serveur ---
echo ""
echo -e "${BOLD}5. Informations serveur exposees${NC}"
SERVER_HEADER=$(echo "$HEADERS" | grep -i "^server:" | sed 's/\r//')
POWERED_BY=$(echo "$HEADERS" | grep -i "^x-powered-by:" | sed 's/\r//')

if [ -n "$SERVER_HEADER" ]; then
    if echo "$SERVER_HEADER" | grep -q "/"; then
        printf "  ${RED}✗${NC} %s ${RED}← version exposee (ajouter server_tokens off;)${NC}\n" "$SERVER_HEADER"
        ISSUES=$((ISSUES + 1))
    else
        printf "  ${GREEN}✓${NC} %s (version masquee)\n" "$SERVER_HEADER"
    fi
fi

if [ -n "$POWERED_BY" ]; then
    printf "  ${RED}✗${NC} %s ${RED}← a supprimer${NC}\n" "$POWERED_BY"
    ISSUES=$((ISSUES + 1))
else
    printf "  ${GREEN}✓${NC} X-Powered-By non expose\n"
fi

# --- Headers sw.js ---
echo ""
echo -e "${BOLD}6. Cache sw.js${NC}"
SW_CACHE=$(curl -skI "$BASE/sw.js" 2>/dev/null | grep -i "cache-control" | tail -1 | sed 's/\r//')
if echo "$SW_CACHE" | grep -qi "no-cache"; then
    printf "  ${GREEN}✓${NC} %s\n" "$SW_CACHE"
else
    printf "  ${RED}✗${NC} sw.js cache mal configure: %s\n" "${SW_CACHE:-AUCUN HEADER}"
    ISSUES=$((ISSUES + 1))
fi

# --- SSL ---
echo ""
echo -e "${BOLD}7. SSL/TLS${NC}"
SSL_INFO=$(curl -skI "$BASE/" -w "ssl_version:%{ssl_verify_result}" -o /dev/null 2>&1)
CERT_DATES=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ -n "$CERT_DATES" ]; then
    EXPIRY=$(echo "$CERT_DATES" | grep "notAfter" | cut -d= -f2)
    printf "  ${GREEN}✓${NC} Certificat expire le: %s\n" "$EXPIRY"
else
    printf "  ${YELLOW}⚠${NC} Impossible de verifier le certificat SSL\n"
fi

# --- Resume ---
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ISSUES" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}0 probleme detecte${NC}"
else
    echo -e "  ${RED}${BOLD}$ISSUES probleme(s) detecte(s)${NC}"
fi
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
