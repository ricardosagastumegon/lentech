# ============================================================
# fiat-bridge — Multi-stage build (NestJS)
# ============================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/fiat-bridge/package.json ./services/fiat-bridge/
RUN pnpm install --frozen-lockfile --filter fiat-bridge...

FROM deps AS builder
COPY packages/ ./packages/
COPY services/fiat-bridge/ ./services/fiat-bridge/
RUN pnpm --filter fiat-bridge build

FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/services/fiat-bridge/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/fiat-bridge/node_modules ./services/fiat-bridge/node_modules

USER nestjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main"]
