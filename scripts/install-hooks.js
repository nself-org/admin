#!/usr/bin/env node
/**
 * install-hooks.js
 *
 * Installs the version-lockstep pre-commit hook into .git/hooks/.
 * Run automatically via the `prepare` lifecycle script (pnpm install).
 *
 * The hook delegates to scripts/check-version-lockstep.sh, which is already
 * invoked by the existing .git/hooks/pre-commit stub.  This script ensures
 * that a fresh clone wired up via `pnpm install` always has the hook in place.
 *
 * Idempotent: safe to run multiple times.
 */

'use strict'

const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const HOOKS_DIR = path.join(REPO_ROOT, '.git', 'hooks')
const HOOK_PATH = path.join(HOOKS_DIR, 'pre-commit')
const LOCKSTEP_SCRIPT = path.join(
  REPO_ROOT,
  'scripts',
  'check-version-lockstep.sh',
)

const HOOK_CONTENT = `#!/usr/bin/env bash
# Pre-commit hook — installed by scripts/install-hooks.js (pnpm prepare)
# Runs the version-lockstep check before every commit.

ADMIN_ROOT="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd)"
LOCKSTEP="${ADMIN_ROOT}/scripts/check-version-lockstep.sh"

if [ -x "\${LOCKSTEP}" ]; then
  "\${LOCKSTEP}"
else
  echo "[lockstep] WARN: check-version-lockstep.sh not found or not executable — skipping." >&2
fi
`

function log(msg) {
  process.stdout.write('[install-hooks] ' + msg + '\n')
}

function warn(msg) {
  process.stderr.write('[install-hooks] WARN: ' + msg + '\n')
}

// Not inside a git repo (e.g. CI checkout without .git, or published package consumer)
if (!fs.existsSync(HOOKS_DIR)) {
  warn('.git/hooks directory not found — skipping hook installation.')
  process.exit(0)
}

// Ensure the lockstep script itself is executable
try {
  fs.chmodSync(LOCKSTEP_SCRIPT, 0o755)
} catch (err) {
  warn('Could not chmod check-version-lockstep.sh: ' + err.message)
}

// Read existing hook to check if lockstep is already wired in
let existingContent = ''
if (fs.existsSync(HOOK_PATH)) {
  existingContent = fs.readFileSync(HOOK_PATH, 'utf8')
}

if (existingContent.includes('check-version-lockstep.sh')) {
  log('Pre-commit hook already contains lockstep check — no changes needed.')
  process.exit(0)
}

// Either no hook exists or existing hook does not include our check.
// Write a minimal hook that delegates to the lockstep script.
// If a hook already exists (without our check), append rather than overwrite.
if (existingContent.length > 0) {
  const appendBlock = `
# --- Version lockstep (added by scripts/install-hooks.js) ---
ADMIN_ROOT="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd)"
LOCKSTEP="\${ADMIN_ROOT}/scripts/check-version-lockstep.sh"
if [ -x "\${LOCKSTEP}" ]; then
  "\${LOCKSTEP}"
fi
`
  fs.writeFileSync(HOOK_PATH, existingContent.trimEnd() + '\n' + appendBlock)
  log('Appended lockstep check to existing pre-commit hook.')
} else {
  fs.writeFileSync(HOOK_PATH, HOOK_CONTENT)
  log('Created pre-commit hook with lockstep check.')
}

try {
  fs.chmodSync(HOOK_PATH, 0o755)
} catch (err) {
  warn('Could not chmod pre-commit hook: ' + err.message)
}

log('Done.')
