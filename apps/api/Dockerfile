# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Copy workspace root
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install all workspace dependencies from root
RUN npm ci --workspace=apps/api --workspace=packages/db --no-audit --no-fund || \
    npm install --workspace=apps/api --workspace=packages/db --no-audit --no-fund

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
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/apps/api/.next/standalone ./
COPY --from=build /app/apps/api/node_modules ./node_modules

EXPOSE 3001

# server.js is located at apps/api/server.js in the standalone output
CMD ["node", "apps/api/server.js"]
