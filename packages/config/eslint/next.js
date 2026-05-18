// @nself/config — Next.js flat-config preset (extends base, adds React + Next.js rules).
// Consumers: `import nextConfig from '@nself/config/eslint/next'`
import { baseConfig } from './base.js'

/** @type {import('eslint').Linter.Config[]} */
export const nextEslintConfig = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Next.js + React conventions live here. Heavy presets (eslint-config-next,
      // typescript-eslint, react-hooks) are listed as optional peers — consumers
      // wire them up locally since each app may pin different versions.
      'react/jsx-uses-vars': 'off', // handled by Next's tsconfig plugin
    },
  },
]

export default nextEslintConfig
