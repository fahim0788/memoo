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
COPY apps/api/package.json ./apps/api/

# 2) Install dependencies (layer cachée si package.json inchangé)
RUN npm ci --workspace=apps/api --workspace=packages/db --no-audit --no-fund || \
    npm install --workspace=apps/api --workspace=packages/db --no-audit --no-fund

# 3) Copy source code (changements fréquents -> layer séparée)
COPY packages ./packages
COPY apps/api ./apps/api

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Valeurs factices pour le build (prisma generate + Next.js collect page data)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV JWT_SECRET="build-only-placeholder"

# Copy everything from deps
COPY --from=deps /app ./

# Generate Prisma Client and build packages/db
WORKDIR /app/packages/db
RUN npx prisma generate && npm run build

# Build API
WORKDIR /app/apps/api
RUN npm run build

# =============================================================================
# Stage 3: Migrations (used by deploy script)
# =============================================================================
FROM build AS migrate
WORKDIR /app/packages/db
CMD ["npx", "prisma", "migrate", "deploy"]

# =============================================================================
# Stage 4: Runtime
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built files and dependencies
# outputFileTracingRoot in next.config.js traces monorepo deps into standalone
COPY --from=build /app/apps/api/.next/standalone ./
COPY --from=build /app/packages/db ./packages/db
# Prisma engine binary: hoisted to root node_modules by npm workspaces
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

# server.js is located at apps/api/server.js in the standalone output
CMD ["node", "apps/api/server.js"]
