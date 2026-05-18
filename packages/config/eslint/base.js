// @nself/config — base ESLint flat-config preset (ESLint 9+).
// Consumers extend by spreading: `export default [...baseConfig, { /* overrides */ }]`
import js from '@eslint/js'

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
]

export default baseConfig
