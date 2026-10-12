import type { NextConfig } from 'next'
import { isProductionApiEnvironment, resolvePublicApiBaseUrl, resolveServerApiBaseUrl } from './lib/api-base-url.mjs'

const production = isProductionApiEnvironment({
  vercelEnv: process.env.VERCEL_ENV,
  appEnv: process.env.APP_ENV,
})
// Validate both settings before Next starts building/static rendering.
resolvePublicApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL, production)
const serverApiBaseUrl = resolveServerApiBaseUrl({
  internalUrl: process.env.INTERNAL_API_URL,
  publicUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  production,
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'www.aladin.co.kr' },
      { protocol: 'https', hostname: 'cover.nl.go.kr' },
      { protocol: 'https', hostname: 'bookthumb-phinf.pstatic.net' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${serverApiBaseUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
