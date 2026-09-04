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
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// packages/config/eslint/ -> repo root is three levels up.
const REPO_ROOT = path.resolve(__dirname, '../../..')
const ALLOWLIST_PATH = path.join(REPO_ROOT, 'eslint-max-lines-allowlist.json')
const MAX_LINES_OPTIONS = { max: 300, skipBlankLines: true, skipComments: true }

function loadAllowlist() {
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
    return raw.files ?? []
  } catch {
    return []
  }
}

const allowlisted = loadAllowlist()

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
