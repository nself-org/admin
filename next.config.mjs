import withBundleAnalyzer from '@next/bundle-analyzer'
import createNextIntlPlugin from 'next-intl/plugin'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  env: {
    PROJECT_PATH: process.env.PROJECT_PATH || '.backend',
  },
  experimental: {
    optimizeCss: true,
  },
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Security headers
  // NOTE: CSP with nonce injection is handled in middleware.ts (per-request
  // nonce).  The static headers below set everything EXCEPT CSP so that
  // middleware's dynamic CSP wins.  CSP here would override middleware on
  // static assets; we let middleware handle all dynamic routes and rely on
  // next.config static CSP only as a fallback for static files.
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    // Base CSP without nonce — used for static asset responses only.
    // Dynamic pages get a per-request nonce injected by middleware.
    const staticCsp = isProd
      ? [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss:",
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss:",
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: staticCsp,
          },
        ],
      },
    ]
  },
  // Webpack config for production builds
  webpack: (config, { isServer }) => {
    // Handle native modules for dockerode
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push('ssh2', 'cpu-features')
    }

    // Ignore native bindings
    config.resolve.alias = {
      ...config.resolve.alias,
      ssh2: false,
      'cpu-features': false,
    }

    return config
  },
  // Server external packages for native modules
  serverExternalPackages: ['ssh2', 'dockerode', 'cpu-features'],
}

export default bundleAnalyzer(withNextIntl(nextConfig))
