FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm turbo
WORKDIR /app
COPY . .
RUN turbo prune --scope=@nearbook/web --docker

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
RUN pnpm build --filter=@nearbook/web...

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV CI=true

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nestjs

COPY --from=installer /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
