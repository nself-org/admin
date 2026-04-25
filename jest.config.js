const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// ESM-only packages that must be transpiled by Jest.
// next/jest wraps transformIgnorePatterns — we list packages that ship as ESM-only
// so the SWC transform (via next/jest) covers them rather than leaving raw ESM.
// rehype-sanitize and its dependencies (hast-util-sanitize, unist-util-visit, etc.)
// are pure ESM in their v6/v7+ releases. react-markdown and remark-gfm are the same.
const esmPackages = [
  'rehype-sanitize',
  'hast-util-sanitize',
  'hast-util-to-html',
  'hast-util-from-parse5',
  'hast-util-raw',
  'hast-util-to-parse5',
  'hast-util-to-text',
  'hast-util-is-element',
  'hast-util-has-property',
  'hast-util-select',
  'hast-util-whitespace',
  'hastscript',
  'property-information',
  'unist-util-visit',
  'unist-util-visit-parents',
  'unist-util-is',
  'unist-util-stringify-position',
  'react-markdown',
  'remark-gfm',
  'remark-rehype',
  'rehype-stringify',
  'rehype-parse',
  'rehype-raw',
  'unified',
  'bail',
  'is-plain-obj',
  'trough',
  'vfile',
  'vfile-message',
  'html-void-elements',
  'comma-separated-tokens',
  'space-separated-tokens',
  'decode-named-character-reference',
  'character-entities',
  'zwitch',
  'mdast-util-to-hast',
  'mdast-util-from-markdown',
  'mdast-util-to-markdown',
  'micromark',
  'mdast-util-gfm',
  'micromark-extension-gfm',
]

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Allow next/jest SWC to transpile ESM-only unified/rehype packages
  transformIgnorePatterns: [
    `/node_modules/(?!(${esmPackages.join('|')})/)`,
  ],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!**/node_modules/**',
    '!src/app/layout.tsx',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/not-found.tsx',
  ],
  collectCoverage: true,
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 4,
      branches: 35,
    },
  },
  testTimeout: 10000,
  passWithNoTests: true,
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
}

module.exports = createJestConfig(customJestConfig)
