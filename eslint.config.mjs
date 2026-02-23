import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import security from 'eslint-plugin-security'

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

      // Disable missing react-hooks rules (not configured in flat config)
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'off',

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
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', '*.config.*'],
  },
]
