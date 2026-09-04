// @nself/config — shared `max-lines` ratchet (ASI Policy 3, <=300 lines/file).
//
// Purpose: `max-lines` is `error` for every admin source file; the ~237 files
//          already over the cap (legacy companion-GUI debt) are recorded in
//          eslint-max-lines-allowlist.json (scripts/eslint-max-lines-allowlist.mjs)
//          and silenced (`off`) here, so lint keeps passing on existing debt while
//          any *new* oversized file fails CI immediately. `off`, not `warn`: admin's
//          own lint script is `eslint src --max-warnings=0`, so a `warn` verdict on
//          a grandfathered file would still fail the gate exactly like `error`
//          would (verified empirically against web's identical apps before this
//          file was written). The allowlist must only shrink — re-run the
//          generator's --write after a file is split back under the cap to drop it.
// Inputs:  none (reads eslint-max-lines-allowlist.json from repo root at load time).
// Outputs: an ESLint flat-config array fragment, spread into eslint.config.mjs.
// Constraints: missing/unreadable allowlist file => treated as empty (rule is
//   `error` everywhere) rather than throwing, so lint never hard-fails on a stale
//   checkout that hasn't run the generator yet.
//   BUG FIXED 2026-09-04: this package is consumed via `"@nself/config":
//   "file:packages/config"`, which pnpm COPIES into node_modules/.pnpm/... at
//   install time (not a symlink back to packages/config/). A `__dirname`-relative
//   walk up from the copy's location lands inside node_modules, not the admin
//   repo root, so the allowlist silently resolved to [] and every allowlisted
//   file kept failing as `error` in CI (nself-org/admin#97, "Lint" + "Lint &
//   Format" jobs). Fixed by resolving against `process.cwd()` instead: ESLint's
//   config file always executes with cwd = the invoking project's root (`eslint
//   src --max-warnings=0` run via `pnpm lint` from repo root), which is stable
//   regardless of where this package physically lives on disk.
//   BUG FIXED 2026-09-04 (same PR): admin's Next.js dynamic-route files (e.g.
//   `src/app/plugins/[name]/page.tsx`) still failed as `error` after the fix
//   above, because `[name]` is unescaped glob syntax -- minimatch reads it as
//   a character class ("match one char from the set n,a,m,e"), not the
//   literal folder name, so the `off` override's `files` pattern never
//   matched those paths. Every allowlist entry is now glob-escaped before
//   being handed to ESLint.
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ALLOWLIST_PATH = path.join(process.cwd(), 'eslint-max-lines-allowlist.json')
const MAX_LINES_OPTIONS = { max: 300, skipBlankLines: true, skipComments: true }

function loadAllowlist() {
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
    return raw.files ?? []
  } catch {
    return []
  }
}

/** Escape minimatch/picomatch glob metacharacters so a literal path (e.g. a
 * Next.js `[param]` route segment) is matched as-is, not as glob syntax. */
function escapeGlob(filePath) {
  return filePath.replace(/[[\]()*?{}!+@]/g, '\\$&')
}

const allowlisted = loadAllowlist().map(escapeGlob)

/** @type {import('eslint').Linter.Config[]} */
export const maxLinesConfig = [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'max-lines': ['error', MAX_LINES_OPTIONS],
    },
  },
  ...(allowlisted.length
    ? [
        {
          files: allowlisted,
          rules: {
            'max-lines': 'off',
          },
        },
      ]
    : []),
]

export default maxLinesConfig
