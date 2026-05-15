#!/usr/bin/env bash
# scripts/sec-lint.sh — security lint for admin TypeScript source
#
# Fails (exit 1) if string-interpolated exec()/execSync() with template literals
# are found in admin/src/**/*.ts — an RCE-class vulnerability.
# execFile()/execFileSync() in argv form is explicitly allowed.
#
# Run: bash scripts/sec-lint.sh [path]
# Default path: admin/src

set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)/src}"
FAIL=0

if [ -t 1 ]; then
  RED='\033[0;31m'
  NC='\033[0m'
else
  RED=''
  NC=''
fi

fail() {
  printf "%b[SEC-LINT FAIL]%b %s\n" "$RED" "$NC" "$1" >&2
  FAIL=1
}

# ── Rule 4: string-interpolated exec() / execSync() with template literals ──
# Matches:
#   exec(`...${var}...`)
#   execSync(`...${var}...`)
# Does NOT match:
#   execFile(...)    — argv form, safe
#   execFileSync(...)
#   exec("fixed string")  — no interpolation

while IFS= read -r line; do
  stripped=$(printf '%s' "$line" | sed 's/^[^:]*:[0-9]*://')
  # Skip lines where // precedes the exec token
  pre_exec=$(printf '%s' "$stripped" | sed 's/exec.*//')
  case "$pre_exec" in
    *//*) continue ;;
  esac
  fail "Rule 4 (RCE template-literal exec): $line"
done < <(
  command grep -rn --include="*.ts" \
    -E 'exec(Sync)?\(`[^`]*\$\{' \
    "$ROOT" \
    | command grep -v 'execFile\|execFileSync' \
    | command grep -v '//.*exec' \
    || true
)

# ── Result ──────────────────────────────────────────────────────────────────

if [ "$FAIL" -eq 0 ]; then
  printf "sec-lint: all checks passed (TS source under %s)\n" "$ROOT"
  exit 0
fi

printf "\nsec-lint: violations found — fix before merging\n" >&2
exit 1
