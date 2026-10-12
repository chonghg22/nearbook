import { isProductionApiEnvironment, resolveServerApiBaseUrl } from './api-base-url.mjs'

// Server-only configuration. Client Components must import constants.ts instead.
export const SERVER_API_BASE_URL = resolveServerApiBaseUrl({
  internalUrl: process.env.INTERNAL_API_URL,
  publicUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  production: isProductionApiEnvironment({
    vercelEnv: process.env.VERCEL_ENV,
    appEnv: process.env.APP_ENV,
  }),
})
