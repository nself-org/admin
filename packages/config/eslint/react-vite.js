// @nself/config — React + Vite flat-config preset (extends base, adds React rules).
// Consumers: `import reactViteConfig from '@nself/config/eslint/react-vite'`
import { baseConfig } from './base.js'
import { maxLinesConfig } from './max-lines.js'

/** @type {import('eslint').Linter.Config[]} */
export const reactViteEslintConfig = [
  ...baseConfig,
  ...maxLinesConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      'react/jsx-uses-vars': 'off',
    },
  },
]

export default reactViteEslintConfig
