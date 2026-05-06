FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm turbo
WORKDIR /app
COPY . .
RUN turbo prune --scope=@nearbook/api --docker

FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm
WORKDIR /app

# Copy all pruned files at once to maintain workspace structure
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY turbo.json turbo.json

# Install and build in one clean environment
RUN pnpm install --frozen-lockfile
ENV CI=true
RUN pnpm build --filter=@nearbook/api...

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV CI=true

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy essential workspace files
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/apps/api/dist ./apps/api/dist
COPY --from=installer /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
ENV PORT 3001

# NestJS build output path in monorepo structure
CMD ["node", "apps/api/dist/apps/api/src/main"]

