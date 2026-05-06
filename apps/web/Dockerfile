FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm turbo

WORKDIR /app
COPY . .

# Install all dependencies with hoisting to avoid symlink issues in Docker
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Build all packages
ENV CI=true
RUN npx turbo run build --filter=@nearbook/web...

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV CI=true

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nestjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
