FROM node:20-slim AS base

# Install dependencies
FROM base AS deps
RUN apt-get update && apt-get install -y --fix-missing \
    libc6 \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* || true
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install dependencies - both workspace and app-specific
RUN npm install -g husky && \
    npm install --workspaces --include-workspace-root --legacy-peer-deps

# Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/turbo.json ./
COPY apps/api ./apps/api
COPY turbo.json ./

RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma
RUN npx tsc --project apps/api/tsconfig.json

# Production
FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy built app and dependencies
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package*.json ./

# Copy workspace node_modules
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules

# Install production dependencies for the app
RUN npm install --production --legacy-peer-deps && \
    chown -R apiuser:nodejs node_modules

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R apiuser:nodejs logs

USER apiuser

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
