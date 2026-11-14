# Self-hosted Next.js (standalone) image for www.near-book.com
# Build from the repo root:
#   docker build -f apps/web/Dockerfile --build-arg ... -t nearbook-web:<sha> .
FROM node:20-slim AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml turbo.json package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @nearbook/web...

COPY apps/web/ ./apps/web/
COPY packages/ ./packages/

# Values below are inlined into the client bundle / routes manifest at build time.
ARG APP_ENV=production
ARG INTERNAL_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT_BOOK_INLINE
ARG NEXT_PUBLIC_ADSENSE_SLOT_HOME_FOOTER
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_OPERATOR_NAME
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_NAVER_SITE_VERIFICATION
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV APP_ENV=$APP_ENV \
    INTERNAL_API_URL=$INTERNAL_API_URL \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=$NEXT_PUBLIC_NAVER_MAP_CLIENT_ID \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_SLOT_BOOK_INLINE=$NEXT_PUBLIC_ADSENSE_SLOT_BOOK_INLINE \
    NEXT_PUBLIC_ADSENSE_SLOT_HOME_FOOTER=$NEXT_PUBLIC_ADSENSE_SLOT_HOME_FOOTER \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_OPERATOR_NAME=$NEXT_PUBLIC_OPERATOR_NAME \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    NEXT_PUBLIC_NAVER_SITE_VERIFICATION=$NEXT_PUBLIC_NAVER_SITE_VERIFICATION \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_TELEMETRY_DISABLED=1 \
    CI=true
RUN pnpm turbo build --filter=@nearbook/web...

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
