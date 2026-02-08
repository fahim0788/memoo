# =============================================================================
# Stage 1: Dependencies (Monorepository aware)
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json files for workspace setup
COPY package.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies for web workspace only
# Use --legacy-peer-deps if there are peer dependency conflicts
RUN npm install --workspace=apps/web --include-workspace-root --no-audit --no-fund

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_APP_NAME=MemoList

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace configuration
COPY package.json ./

# Copy web app source files
COPY apps/web ./apps/web

# Build the web app
WORKDIR /app/apps/web
RUN npm run build

# =============================================================================
# Stage 3: Runtime (Next.js standalone)
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# The standalone build includes all necessary files
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
