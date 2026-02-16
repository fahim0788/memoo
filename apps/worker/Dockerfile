# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# 1) Copy only package files (cached tant que les deps ne changent pas)
COPY package.json package-lock.json* ./
COPY packages/db/package.json ./packages/db/
COPY apps/worker/package.json ./apps/worker/

# 2) Install dependencies (layer cachée si package.json inchangé)
RUN npm ci --workspace=apps/worker --workspace=packages/db --no-audit --no-fund || \
    npm install --workspace=apps/worker --workspace=packages/db --no-audit --no-fund

# 3) Copy source code (changements fréquents -> layer séparée)
COPY packages ./packages
COPY apps/worker ./apps/worker

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# URL factice pour prisma generate
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# Copy everything from deps
COPY --from=deps /app ./

# Generate Prisma Client and build packages/db
WORKDIR /app/packages/db
RUN npx prisma generate && npm run build

# Build worker
WORKDIR /app/apps/worker
RUN npm run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy monorepo structure to maintain module resolution
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker ./apps/worker

# Set working directory to worker
WORKDIR /app/apps/worker

# Créer le dossier de stockage
RUN mkdir -p /app/storage/tts

CMD ["node", "dist/index.js"]
