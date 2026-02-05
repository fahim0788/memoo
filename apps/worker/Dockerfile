# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# URL factice pour prisma generate (pas de connexion réelle au build)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Compiler TypeScript
RUN npm run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copier node_modules et binaires compilés
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Créer le dossier de stockage
RUN mkdir -p /app/storage/tts

CMD ["node", "dist/index.js"]
