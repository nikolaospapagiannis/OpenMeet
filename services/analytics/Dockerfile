FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 serviceuser
COPY --from=builder --chown=serviceuser:nodejs /app/dist ./dist
COPY --from=builder --chown=serviceuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=serviceuser:nodejs /app/package*.json ./
USER serviceuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"
CMD ["node", "dist/index.js"]
