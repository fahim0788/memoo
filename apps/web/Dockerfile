# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copier tout le monorepo (safe avec .dockerignore)
COPY . .

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

ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_APP_NAME=Memooo

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

COPY --from=deps /app ./

RUN npm run build --workspace=apps/web

# =============================================================================
# Stage 3: Runtime (Next.js standalone)
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./.next/static
COPY --from=build /app/apps/web/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
