#!/usr/bin/env bash
# check-version-lockstep.sh
#
# Pre-commit hook: verifies that the three version sources are in lockstep:
#   1. admin/package.json         → PACKAGE_VERSION
#   2. admin/src/lib/cli-version.ts → CLI_VERSION_TS
#   3. cli/internal/version/version.go (sibling repo, optional) → GO_VERSION
#
# Usage: run from the admin/ repo root, or install as .git/hooks/pre-commit.
#
# Exit codes:
#   0  all versions match (or only a non-blocking warning)
#   1  mismatch detected — commit is blocked

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── helpers ──────────────────────────────────────────────────────────────────

info()  { printf '\033[0;34m[lockstep]\033[0m %s\n' "$*"; }
ok()    { printf '\033[0;32m[lockstep]\033[0m %s\n' "$*"; }
warn()  { printf '\033[0;33m[lockstep] WARN:\033[0m %s\n' "$*" >&2; }
error() { printf '\033[0;31m[lockstep] ERROR:\033[0m %s\n' "$*" >&2; }

FAIL=0

# ── 1. Read package.json version ─────────────────────────────────────────────

PACKAGE_JSON="${ADMIN_ROOT}/package.json"

if [ ! -f "${PACKAGE_JSON}" ]; then
  error "package.json not found at ${PACKAGE_JSON}"
  exit 1
fi

PACKAGE_VERSION=$(node -p "require('${PACKAGE_JSON}').version" 2>/dev/null)

if [ -z "${PACKAGE_VERSION}" ]; then
  error "Could not read version from ${PACKAGE_JSON}"
  exit 1
fi

info "package.json version     : ${PACKAGE_VERSION}"

# ── 2. Read cli-version.ts CLI_VERSION ───────────────────────────────────────

CLI_VERSION_FILE="${ADMIN_ROOT}/src/lib/cli-version.ts"

if [ ! -f "${CLI_VERSION_FILE}" ]; then
  error "cli-version.ts not found at ${CLI_VERSION_FILE}"
  exit 1
fi

CLI_VERSION_TS=$(grep -E "^export const CLI_VERSION" "${CLI_VERSION_FILE}" \
  | sed "s/export const CLI_VERSION = '//;s/'.*//")

if [ -z "${CLI_VERSION_TS}" ]; then
  error "Could not parse CLI_VERSION from ${CLI_VERSION_FILE}"
  exit 1
fi

info "cli-version.ts CLI_VERSION: ${CLI_VERSION_TS}"

# ── 3. Compare package.json vs cli-version.ts ────────────────────────────────

if [ "${PACKAGE_VERSION}" != "${CLI_VERSION_TS}" ]; then
  error "Mismatch between admin/package.json (${PACKAGE_VERSION}) and src/lib/cli-version.ts (${CLI_VERSION_TS})"
  error "Both files must be updated atomically when bumping the version."
  FAIL=1
fi

# ── 4. Optional: compare against sibling cli/ repo ───────────────────────────

CLI_VERSION_GO_FILE="${ADMIN_ROOT}/../cli/internal/version/version.go"

if [ -f "${CLI_VERSION_GO_FILE}" ]; then
  GO_VERSION=$(grep -E 'Version[[:space:]]+string[[:space:]]*=' "${CLI_VERSION_GO_FILE}" \
    | sed 's/.*Version[[:space:]]*string[[:space:]]*=[[:space:]]*"//;s/".*//')

  if [ -n "${GO_VERSION}" ]; then
    info "cli/internal/version/version.go: ${GO_VERSION}"

    if [ "${PACKAGE_VERSION}" != "${GO_VERSION}" ]; then
      warn "admin/package.json (${PACKAGE_VERSION}) differs from cli/internal/version/version.go (${GO_VERSION})"
      warn "Ensure both repos are bumped together before releasing."
    else
      ok "cli/version.go matches: ${GO_VERSION}"
    fi
  else
    warn "Could not parse Version from ${CLI_VERSION_GO_FILE} — skipping Go cross-check."
  fi
else
  info "cli/internal/version/version.go not found at expected sibling path — skipping Go cross-check."
fi

# ── 5. Final result ───────────────────────────────────────────────────────────

if [ "${FAIL}" -eq 1 ]; then
  error "Version lockstep check FAILED. Fix the mismatch before committing."
  exit 1
fi

ok "Version lockstep OK: all sources agree on v${PACKAGE_VERSION}"
exit 0
