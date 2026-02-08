# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace root (package-lock.json* makes it optional)
COPY package.json package-lock.json* ./
COPY apps/web ./apps/web

# Install workspace dependencies from root (with fallback like API)
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
