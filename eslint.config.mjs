import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import security from 'eslint-plugin-security'

// S11.T01: ui-state-coverage rule (resolved at runtime). admin is a separate
// git repo from web/, so it cannot use workspace:* — the package is published
// via the web monorepo and consumed here as a regular npm dep. If it has not
// been installed yet (fresh clone, pre-install state, or out-of-tree consumer)
// we fall back to a stub plugin that registers a no-op rule so flat-config
// validation passes without breaking admin's lint pipeline.
const noopRule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { stub: 'Stub: install @nself-web/eslint-plugin-nself to enable.' },
  },
  create() {
    return {}
  },
}
let nselfPlugin = {
  meta: { name: '@nself-web/eslint-plugin-nself-stub', version: '0.0.0' },
  rules: { 'ui-state-coverage': noopRule },
}
try {
  const mod = await import('@nself-web/eslint-plugin-nself')
  if (mod && mod.default && mod.default.rules && mod.default.rules['ui-state-coverage']) {
    nselfPlugin = mod.default
  }
} catch {
  // Plugin not installed locally — keep the stub. Real CI runs install the
  // package via the lockfile so the live rule activates there.
}

export default [
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestIdleCallback: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        performance: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        EventSource: 'readonly',
        WebSocket: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        NodeJS: 'readonly',
        CustomEvent: 'readonly',
        HTMLInputElement: 'readonly',
        Event: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        ReadableStream: 'readonly',
        TextEncoder: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      security: security,
    },
    rules: {
      // TypeScript handles these better
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off', // TypeScript handles this

      // Warnings for code quality
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',

      // Relaxed rules for this codebase patterns
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'no-control-regex': 'off', // Used for ANSI escape sequence handling
      'no-useless-escape': 'warn',
      'no-useless-catch': 'warn',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Security rules
      'security/detect-object-injection': 'warn', // Too many false positives in TypeScript
      'security/detect-non-literal-fs-filename': 'warn', // We use validated paths
      'security/detect-non-literal-require': 'warn',
      'security/detect-unsafe-regex': 'warn', // Too many false positives for safe regex patterns
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn', // We use execFile safely
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
    },
  },
  {
    files: ['src/app/api/**/*.ts'],
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  // S11.T01: ui-state-coverage — enforce 7-state UI on data-fetching
  // components in admin/src/**/*.{ts,tsx}. Severity error blocks CI on
  // missing 429 / offline branches; auto-fix inserts a TODO marker.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { '@nself-web/nself': nselfPlugin },
    rules: {
      '@nself-web/nself/ui-state-coverage': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      '*.config.*',
      // Dead code / pending code files — not part of the shipped product
      'src/app/page.old.tsx',
      'src/components/services_pending_code.tsx',
    ],
  },
]
