// @nself/config prettier base + admin-specific plugin extensions.
// admin/ is a separate git repo from web/ and consumes @nself/config as a
// regular dep (file: during PUBLISH_STAGED phase, semver after S28 publish).
import { prettierConfig } from '@nself/config/prettier'

/** @type {import('prettier').Options} */
export default {
  ...prettierConfig,
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/tailwind.css',
}
