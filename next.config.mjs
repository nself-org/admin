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
  // NOTE: CSP is handled entirely by middleware.ts (per-request nonce).
  // Do NOT set Content-Security-Policy here — a duplicate CSP header from
  // next.config would be applied alongside middleware's nonce-bearing CSP via
  // HTTP CSP intersection rules (browsers apply ALL CSP headers, taking the
  // union of restrictions).  A static "script-src 'self'" header here would
  // override middleware's "'nonce-<X>'" and block all inline hydration scripts,
  // causing a blank page (NO_FCP) in Lighthouse and in browsers.
  // Non-CSP security headers are still set here for defence-in-depth.
  async headers() {
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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
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
