// @nself/config — programmatic entry. Re-exports config presets for tooling that
// wants to read them at runtime (e.g. a `nself doctor` lint-config sanity check).
export { baseConfig } from '../eslint/base.js'
export { nextEslintConfig } from '../eslint/next.js'
export { reactViteEslintConfig } from '../eslint/react-vite.js'
export { prettierConfig } from '../prettier/index.js'

// Convenience helper: returns the canonical preset name a consumer should pick
// for a given framework. Used by scaffolding tools.
/**
 * @param {'next' | 'react-vite' | 'base'} framework
 * @returns {{ tsconfig: string, eslint: string, prettier: string }}
 */
export function configFor(framework) {
  const map = {
    next: {
      tsconfig: '@nself/config/tsconfig/next.json',
      eslint: '@nself/config/eslint/next',
      prettier: '@nself/config/prettier',
    },
    'react-vite': {
      tsconfig: '@nself/config/tsconfig/react-vite.json',
      eslint: '@nself/config/eslint/react-vite',
      prettier: '@nself/config/prettier',
    },
    base: {
      tsconfig: '@nself/config/tsconfig/base.json',
      eslint: '@nself/config/eslint/base',
      prettier: '@nself/config/prettier',
    },
  }
  const cfg = map[framework]
  if (!cfg) throw new Error(`@nself/config: unknown framework "${framework}"`)
  return cfg
}
