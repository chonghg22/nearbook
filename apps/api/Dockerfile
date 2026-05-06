FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm turbo
WORKDIR /app
COPY . .
# Prune the workspace for the API only
RUN turbo prune --scope=@nearbook/api --docker

FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app

# Copy the pruned lockfile and package.json files
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Install with shamefully-hoist to avoid link issues in Docker
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy the actual source code (pruned)
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Build only the API and its dependencies
ENV CI=true
RUN npx turbo build --filter=@nearbook/api...

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV CI=true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy essential files for execution
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/apps/api/dist ./apps/api/dist
COPY --from=installer /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
ENV PORT 3001

CMD ["node", "apps/api/dist/apps/api/src/main"]
