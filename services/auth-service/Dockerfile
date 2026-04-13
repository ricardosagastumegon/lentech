# ============================================================
# auth-service — Multi-stage build (NestJS)
# ============================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/auth-service/package.json ./services/auth-service/
RUN pnpm install --frozen-lockfile --filter auth-service...

# ---- build ----
FROM deps AS builder
COPY packages/ ./packages/
COPY services/auth-service/ ./services/auth-service/
RUN pnpm --filter auth-service build

# ---- runner ----
FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/services/auth-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/auth-service/node_modules ./services/auth-service/node_modules

USER nestjs
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/main"]
