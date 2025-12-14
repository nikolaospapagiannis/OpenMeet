FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files for monorepo
COPY package*.json ./
COPY turbo.json ./
COPY apps/realtime-service/package*.json ./apps/realtime-service/

# Install all dependencies from root
# Install husky globally first to prevent prepare script errors
RUN npm install -g husky && npm install --workspaces && npm cache clean --force

FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY apps/realtime-service ./apps/realtime-service
COPY turbo.json ./

# Build the service
WORKDIR /app/apps/realtime-service
RUN npm run build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wsuser

COPY --from=builder --chown=wsuser:nodejs /app/apps/realtime-service/dist ./dist
COPY --from=builder --chown=wsuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=wsuser:nodejs /app/apps/realtime-service/package*.json ./

USER wsuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

CMD ["node", "dist/index.js"]
