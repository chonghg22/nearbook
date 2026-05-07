FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app

# Copy workspace config and all package.json files
COPY pnpm-workspace.yaml pnpm-lock.yaml turbo.json package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Build the API and its dependencies
ENV CI=true
RUN pnpm turbo build --filter=@nearbook/api...

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV CI=true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy built output and all node_modules
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/packages ./packages
COPY --from=base /app/package.json ./package.json

EXPOSE 3001
ENV PORT=3001

CMD ["node", "apps/api/dist/apps/api/src/main"]
