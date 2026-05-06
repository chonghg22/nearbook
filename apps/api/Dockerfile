FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm turbo

WORKDIR /app
COPY . .

# Install all dependencies with hoisting to avoid symlink issues in Docker
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Build all packages
ENV CI=true
RUN npx turbo run build --filter=@nearbook/api...

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV CI=true

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy the entire workspace structure needed for execution
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
ENV PORT 3001

# Correct path for NestJS in this monorepo build
CMD ["node", "apps/api/dist/apps/api/src/main"]
