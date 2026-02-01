# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Contournement certificat SSL (proxy entreprise)
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

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

# Générer Prisma Client au build
RUN npx prisma generate

RUN npm run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copier standalone server
COPY --from=build /app/.next/standalone ./

# Copier Prisma (schema + generated client)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma

# Copier prisma.config.ts + dépendances (tsx, esbuild, dotenv, prisma CLI)
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/tsx ./node_modules/tsx
COPY --from=build /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=build /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=build /app/node_modules/dotenv ./node_modules/dotenv

EXPOSE 3001

CMD ["node", "server.js"]
