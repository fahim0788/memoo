# 🐳 Configuration Docker pour Monorepository Next.js

## 📋 Problème résolu

Build Docker échouait avec erreurs :
- ❌ `package-lock.json not found`
- ❌ Conflit monorepository + Next.js standalone
- ❌ `Cannot find module '/app/server.js'` au runtime

## ✅ Solution appliquée

### Architecture

```
memolist-mvp/                    ← Monorepository NPM workspaces
├── apps/
│   ├── web/                     ← App Next.js (PWA)
│   ├── api/                     ← API Next.js
│   └── worker/                  ← Worker TTS
├── packages/
│   └── db/                      ← Package Prisma partagé
├── package.json                 ← Workspace root (sans package-lock.json)
└── docker-compose.yml
```

## 🔑 Concepts clés

### 1. Monorepository ≠ Standalone

- **Monorepository** : Organisation du code source (workspaces NPM)
- **Standalone** : Mode de build Next.js (optimisation production)
- **Les deux sont compatibles** et utilisés ensemble !

### 2. Structure du standalone en monorepository

Next.js standalone préserve la structure monorepository :

```
.next/standalone/
├── apps/
│   └── web/
│       └── server.js    ← Le fichier est ICI !
├── node_modules/
└── package.json
```

## 📁 Fichiers modifiés

### 1. apps/web/Dockerfile

**Stratégie** : Aligner sur le pattern de l'API qui fonctionne

```dockerfile
# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace root (package-lock.json* makes it optional)
COPY package.json package-lock.json* ./
COPY apps/web ./apps/web

# Install workspace dependencies from root (with fallback)
RUN npm ci --workspace=apps/web --no-audit --no-fund || \
    npm install --workspace=apps/web --no-audit --no-fund

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_APP_NAME=MemoList

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Copy everything from deps stage
COPY --from=deps /app ./

# Build web app
WORKDIR /app/apps/web
RUN npm run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build (preserves monorepo structure: apps/web/)
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000

# server.js is located at apps/web/server.js in the standalone output
CMD ["node", "apps/web/server.js"]
```

**Points clés** :

1. ✅ `package-lock.json*` : Le `*` rend le fichier optionnel
2. ✅ `npm ci || npm install` : Fallback si pas de lockfile
3. ✅ `CMD ["node", "apps/web/server.js"]` : Chemin correct du server.js

### 2. docker-compose.yml

```yaml
web:
  build:
    context: .                      # ← Racine du monorepository
    dockerfile: ./apps/web/Dockerfile
    args:
      NEXT_PUBLIC_API_BASE: ${NEXT_PUBLIC_API_BASE:-/api}
      NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-MemoList}
  expose:
    - "3000"
```

**Changement** : `context: .` au lieu de `context: ./apps/web`

### 3. .dockerignore (nouveau)

```
# Dependencies
node_modules
**/node_modules

# Build outputs
.next
**/dist

# Git
.git

# Environment
.env

# Logs
*.log

# Docker
Dockerfile
docker-compose*.yml
```

## 🧪 Tests et validation

### Build et lancement

```bash
# Build avec cache nettoyé
docker-compose build --no-cache web

# Lancer en daemon
docker-compose up -d web

# Vérifier les logs
docker-compose logs -f web
```

### Vérifier que ça fonctionne

```bash
# Test local
curl http://localhost:3000

# Test via nginx
curl http://localhost

# Voir les conteneurs
docker-compose ps
```

## 🔍 Débogage

### Inspecter la structure standalone

Ajouter temporairement dans le Dockerfile après le build :

```dockerfile
RUN echo "=== Standalone structure ===" && \
    ls -laR .next/standalone/ && \
    find .next/standalone/ -name "server.js"
```

### Logs en temps réel

```bash
# Logs web
docker-compose logs -f web

# Logs nginx
docker-compose logs -f nginx

# Tous les logs
docker-compose logs -f
```

### Shell dans le conteneur

```bash
# Entrer dans le conteneur web
docker exec -it memoo_web_1 sh

# Vérifier la structure
ls -la /app/
find /app -name "server.js"
```

## 📊 Comparaison avec API

| Aspect | API | Web |
|--------|-----|-----|
| **Contexte Docker** | `.` (racine) | `.` (racine) |
| **Standalone** | ✅ Oui | ✅ Oui |
| **Package local** | ✅ @memolist/db | ❌ Aucun |
| **CMD** | `node server.js` | `node apps/web/server.js` |

**Pourquoi CMD différent ?**

L'API copie aussi `packages/db` et a une structure différente dans le standalone.

## ⚠️ Warnings React (non bloquants)

```
npm warn ERESOLVE overriding peer dependency
react@18.2.0 vs react@18.3.1
```

**Solution future** : Mettre à jour les versions dans package.json

```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

## 🚀 Workflow de déploiement

```bash
# 1. Pull les changements
cd /var/www/memoo
sudo git pull

# 2. Rebuild si Dockerfile modifié
docker-compose build web

# 3. Relancer
docker-compose up -d

# 4. Vérifier
docker-compose ps
docker-compose logs web
```

## 🔄 Mise à jour des dépendances

```bash
# Sur la machine de développement
cd apps/web
npm update

# Commit les changements de package.json
git add package.json
git commit -m "Update dependencies"
git push

# Sur le serveur
sudo git pull
docker-compose build --no-cache web
docker-compose up -d
```

## 📝 Checklist de troubleshooting

- [ ] Le contexte Docker est bien `.` (racine) ?
- [ ] Le CMD utilise `apps/web/server.js` ?
- [ ] Le fallback `npm ci || npm install` est présent ?
- [ ] Next.js a `output: "standalone"` dans next.config.js ?
- [ ] Les volumes nginx sont bien montés ?
- [ ] Le port 3000 est exposé ?
- [ ] Nginx route bien `/` vers `web:3000` ?

## ✨ Points clés à retenir

1. **Monorepository + Standalone** : Les deux concepts coexistent
2. **Contexte racine** : Le build Docker doit partir de la racine
3. **Structure préservée** : Next.js standalone garde `apps/web/`
4. **Fallback install** : `npm ci || npm install` gère l'absence de lockfile
5. **CMD correct** : Le chemin doit correspondre à la structure standalone

---

**Dernière mise à jour** : 2026-02-08
