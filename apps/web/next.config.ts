import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'cover.nl.go.kr' },
      { protocol: 'https', hostname: 'bookthumb-phinf.pstatic.net' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ]
  },
}

export default nextConfig
