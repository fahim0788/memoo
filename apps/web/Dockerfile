# =============================================================================
# Stage 1: Dependencies (monorepo aware)
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copier les manifests racine (OBLIGATOIRE pour npm ci)
COPY package.json package-lock.json ./

# Copier le package.json du workspace ciblé
COPY apps/web/package.json apps/web/

# Installer uniquement le workspace web
RUN npm ci \
  --workspace=apps/web \
  --include-workspace-root=false \
  --no-audit \
  --no-fund

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Build arguments pour NEXT_PUBLIC_*
ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_APP_NAME=Memooo

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Récupérer les deps installées
COPY --from=deps /app/node_modules ./node_modules

# Copier le reste du monorepo
COPY . .

# Build du workspace Next.js
RUN npm run build --workspace=apps/web

# =============================================================================
# Stage 3: Runtime (standalone)
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copier le serveur standalone généré par Next
COPY --from=build /app/apps/web/.next/standalone ./

# Copier les assets statiques requis
COPY --from=build /app/apps/web/.next/static ./.next/static
COPY --from=build /app/apps/web/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
