# ============================================================
# compliance — Multi-stage build (NestJS)
# ============================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/compliance/package.json ./services/compliance/
RUN pnpm install --frozen-lockfile --filter compliance...

FROM deps AS builder
COPY packages/ ./packages/
COPY services/compliance/ ./services/compliance/
RUN pnpm --filter compliance build

FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/services/compliance/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/compliance/node_modules ./services/compliance/node_modules

USER nestjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main"]
