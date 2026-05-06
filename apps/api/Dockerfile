FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm turbo

WORKDIR /app
COPY . .
RUN turbo prune --scope=@nearbook/api --docker

FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app

# Install dependencies for the pruned project
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
# Build dependencies first, then the app
ENV CI=true
RUN pnpm exec turbo run build --filter=@nearbook/api...

FROM node:20-slim AS runner
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
COPY --from=installer /app/apps/api/package.json ./package.json

EXPOSE 3001
ENV PORT 3001

# NestJS build output path in monorepo structure
CMD ["node", "apps/api/dist/apps/api/src/main"]

