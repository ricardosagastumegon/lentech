# ============================================================
# card-service — Multi-stage build (NestJS)
# ============================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/card-service/package.json ./services/card-service/
RUN pnpm install --frozen-lockfile --filter card-service...

FROM deps AS builder
COPY packages/ ./packages/
COPY services/card-service/ ./services/card-service/
RUN pnpm --filter card-service build

FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/services/card-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/card-service/node_modules ./services/card-service/node_modules

USER nestjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main"]
