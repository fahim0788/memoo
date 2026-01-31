# =============================================================================
# Build local et deploiement complet vers le Raspberry Pi (PowerShell)
# Usage: .\scripts\build-and-push.ps1 [config.json]
# =============================================================================

param(
    [string]$ConfigFile = "config.json"
)

# Couleurs pour les logs
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Step { Write-Host "[ETAPE] $args" -ForegroundColor Cyan }

# =============================================================================
# 1. Charger la configuration
# =============================================================================

Write-Step "1/7 - Chargement de la configuration"

if (-not (Test-Path $ConfigFile)) {
    Write-Error "Fichier de configuration introuvable: $ConfigFile"
    Write-Info "Creez-le a partir de config.example.json"
    exit 1
}

# Lecture du JSON
$config = Get-Content $ConfigFile -Raw | ConvertFrom-Json

$PI_HOST = $config.pi.host
$PI_USER = $config.pi.user
$PI_PATH = $config.pi.path
$PROJECT_NAME = $config.project.name
$DOMAIN = $config.project.domain
$DB_NAME = $config.database.name
$DB_USER = $config.database.user
$DB_PASSWORD = $config.database.password
$JWT_SECRET = $config.security.jwt_secret

Write-Info "OK Configuration chargee"
Write-Info "  - Pi: $PI_USER@$PI_HOST"
Write-Info "  - Domaine: $DOMAIN"

# =============================================================================
# 2. Generer le fichier .env pour le Pi
# =============================================================================

Write-Step "2/7 - Generation du fichier .env"

$TEMP_DIR = New-TemporaryFile | Split-Path
$ENV_FILE = Join-Path $TEMP_DIR ".env"

$envContent = @"
# =============================================================================
# Configuration de production - Auto-genere depuis config.json
# Genere le: $(Get-Date)
# =============================================================================

# Domaine
DOMAIN=$DOMAIN

# Base de donnees PostgreSQL
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# Connection string pour Prisma
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# JWT Secret
JWT_SECRET=$JWT_SECRET

# CORS Origin
CORS_ORIGIN=https://$DOMAIN

# Next.js
NODE_ENV=production
"@

$envContent | Out-File -FilePath $ENV_FILE -Encoding UTF8

Write-Info "OK Fichier .env genere"

# =============================================================================
# 3. Build des images Docker pour ARM64 (Raspberry Pi)
# =============================================================================

Write-Step "3/7 - Build des images Docker pour ARM64"

# Verifier si buildx est disponible
try {
    docker buildx version | Out-Null
} catch {
    Write-Error "docker buildx n'est pas disponible"
    Write-Info "Installation: docker buildx install"
    exit 1
}

# Creer un builder multi-plateforme si necessaire
$builderExists = docker buildx ls | Select-String "multiarch"
if (-not $builderExists) {
    Write-Info "Creation du builder multi-plateforme..."
    docker buildx create --name multiarch --use
}

docker buildx use multiarch

# Build de l'image WEB pour ARM64
Write-Info "Build de l'image WEB (ARM64)..."
docker buildx build `
    --platform linux/arm64 `
    --tag "${PROJECT_NAME}-web:latest" `
    --load `
    -f apps/web/Dockerfile `
    apps/web

if ($LASTEXITCODE -ne 0) {
    Write-Error "Echec du build de l'image WEB"
    exit 1
}

# Build de l'image API pour ARM64
Write-Info "Build de l'image API (ARM64)..."
docker buildx build `
    --platform linux/arm64 `
    --tag "${PROJECT_NAME}-api:latest" `
    --load `
    -f apps/api/Dockerfile `
    apps/api

if ($LASTEXITCODE -ne 0) {
    Write-Error "Echec du build de l'image API"
    exit 1
}

Write-Info "OK Images buildees avec succes"

# =============================================================================
# 4. Sauvegarder les images en fichiers .tar
# =============================================================================

Write-Step "4/7 - Sauvegarde des images"

$webTar = Join-Path $TEMP_DIR "web.tar"
$apiTar = Join-Path $TEMP_DIR "api.tar"

docker save "${PROJECT_NAME}-web:latest" -o $webTar
docker save "${PROJECT_NAME}-api:latest" -o $apiTar

$webSize = (Get-Item $webTar).Length / 1MB
$apiSize = (Get-Item $apiTar).Length / 1MB
Write-Info "OK Images sauvegardees ($([math]::Round($webSize, 1)) MB + $([math]::Round($apiSize, 1)) MB)"

# =============================================================================
# 5. Preparer les fichiers de configuration
# =============================================================================

Write-Step "5/7 - Preparation des fichiers de configuration"

$dockerComposeDest = Join-Path $TEMP_DIR "docker-compose.prod.yml"
$scriptsDest = Join-Path $TEMP_DIR "scripts"
$infraDest = Join-Path $TEMP_DIR "infra"

Copy-Item "docker-compose.prod.yml" $dockerComposeDest
Copy-Item -Recurse "scripts" $scriptsDest
Copy-Item -Recurse "infra" $infraDest

Write-Info "OK Fichiers de configuration prepares"

# =============================================================================
# 6. Creer le repertoire sur le Pi et transferer
# =============================================================================

Write-Step "6/7 - Transfert vers le Raspberry Pi"

# Creer la structure de repertoires sur le Pi
Write-Info "Creation des repertoires sur le Pi..."
ssh "${PI_USER}@${PI_HOST}" "mkdir -p ${PI_PATH}/images && mkdir -p ${PI_PATH}/backups && mkdir -p ${PI_PATH}/scripts && mkdir -p ${PI_PATH}/infra/nginx"

Write-Info "Transfert du fichier .env..."
scp $ENV_FILE "${PI_USER}@${PI_HOST}:${PI_PATH}/.env"

Write-Info "Transfert de docker-compose.prod.yml..."
scp $dockerComposeDest "${PI_USER}@${PI_HOST}:${PI_PATH}/"

Write-Info "Transfert des scripts..."
scp -r "$scriptsDest/*" "${PI_USER}@${PI_HOST}:${PI_PATH}/scripts/"

Write-Info "Transfert de la config Nginx..."
scp "$infraDest/nginx/nginx.prod.conf" "${PI_USER}@${PI_HOST}:${PI_PATH}/infra/nginx/"

Write-Info "Transfert des images Docker (cela peut prendre du temps)..."
scp $webTar $apiTar "${PI_USER}@${PI_HOST}:${PI_PATH}/images/"

Write-Info "OK Tous les fichiers transferes"

# =============================================================================
# 7. Charger les images et rendre les scripts executables
# =============================================================================

Write-Step "7/7 - Configuration finale sur le Pi"

ssh "${PI_USER}@${PI_HOST}" "cd ${PI_PATH} && docker load -i images/web.tar && docker load -i images/api.tar && rm -f images/web.tar images/api.tar && chmod +x scripts/*.sh && echo 'OK Configuration terminee'"

Write-Info "OK Images chargees et scripts configures"

# =============================================================================
# Nettoyage local
# =============================================================================

Write-Info "Nettoyage local..."
Remove-Item $webTar, $apiTar, $ENV_FILE -Force

Write-Host ""
Write-Info "========================================="
Write-Info "   OK BUILD ET TRANSFERT TERMINES"
Write-Info "========================================="
Write-Host ""
Write-Info "Fichiers transferes vers ${PI_USER}@${PI_HOST}:${PI_PATH}:"
Write-Info "  - .env (auto-genere depuis config.json)"
Write-Info "  - docker-compose.prod.yml"
Write-Info "  - Images Docker: ${PROJECT_NAME}-web, ${PROJECT_NAME}-api"
Write-Info "  - Scripts de deploiement"
Write-Info "  - Configuration Nginx"
Write-Host ""
Write-Info "Prochaines etapes:"
Write-Info "  1. Connexion: ssh ${PI_USER}@${PI_HOST}"
Write-Info "  2. Aller dans: cd ${PI_PATH}"
Write-Info "  3. Migration initiale: ./scripts/initial-setup.sh"
Write-Info "     OU"
Write-Info "     Deploiement: ./scripts/deploy.sh"
Write-Host ""
