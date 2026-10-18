#!/usr/bin/env bash
# cli-compat.sh (P7-CANON-20)
#
# Proves the shipped admin still works against a cli build, in v1.4 mode
# (NSELF_V15 unset) and in v1.5 mode (NSELF_V15=1):
#
#   1. Extracts every nself argv prefix admin builds from src/ (non-test files)
#      into scripts/cli-argv-inventory.txt, sorted, at most three words each:
#        executeNselfCommand('<cmd>', ['a', 'b', ...])  and streamNselfCommand
#        execFile/spawn(<nself binary>, ['a', 'b', ...])
#        `${nselfPath} a b ...` and exec('nself a b ...') strings
#        runCLI(['a', 'b', ...])
#      A variable argument (execFile(bin, args)) is resolved to the literal
#      array it was declared with, when there is one.
#      A call whose argv cannot be read statically (a variable that is not a
#      literal array, a dynamic command) is listed as `@dynamic <file>` in the
#      inventory, so a new dynamic exec site shows up in the committed diff.
#      The routes that run a user-chosen command must call canonicalizeArgs
#      (checked below).
#   2. Fails when a prefix starts with an old spelling, i.e. a command that cli
#      v1.5 keeps only as a deprecated shim until v1.6.0 (read from
#      `NSELF_V15=1 nself help --json`, canon == deprecated-shim).
#   3. For each prefix, finds the longest word run that is a command in
#      `nself help --json` of the current mode and runs `<that> --help`; fails
#      on a non-zero exit or on a `moved to` warning. A prefix whose full path
#      is not a cli command is printed as UNKNOWN (pre-existing admin/cli
#      drift, not a failure). Nothing here installs a plugin or reaches the
#      network: NSELF_NO_AUTO_ADD=1 and an empty HOME.
#
# Usage:  NSELF_BIN=/path/to/nself [NSELF_V15=1] bash scripts/cli-compat.sh
#         (NSELF_BIN defaults to `nself` on PATH.)
# Needs:  bash, perl, jq.
# Exit:   0 ok, 1 a prefix fails a check, 2 usage or missing tool.

set -euo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INVENTORY="${SCRIPT_DIR}/cli-argv-inventory.txt"
BIN="${NSELF_BIN:-$(command -v nself || true)}"
MODE="v1.4"
[ -n "${NSELF_V15:-}" ] && MODE="v1.5"

for tool in perl jq; do
  command -v "$tool" >/dev/null 2>&1 || { echo "cli-compat: $tool is required" >&2; exit 2; }
done
if [ -z "$BIN" ] || [ ! -x "$BIN" ]; then
  echo "cli-compat: no nself binary (set NSELF_BIN to an executable)" >&2
  exit 2
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/cli-compat.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/home" "$WORK/cwd"

# Run the cli in an empty HOME and cwd, with auto-add off.
nself_run() {
  (cd "$WORK/cwd" && HOME="$WORK/home" NSELF_NO_AUTO_ADD=1 "$BIN" "$@" </dev/null)
}

# ── 1. inventory ─────────────────────────────────────────────────────────────

read -r -d '' PERL_PROG <<'PERL_EOF' || true

    use strict; use warnings;
    my %seen;
    sub words {            # consume string-literal words from an array body at pos()
      my @w;
      while ($_[0] =~ /\G\s*(?:\x27([^\x27]*)\x27|"([^"]*)")\s*(?:,|(?=\]))/gc) {
        my $v = defined $1 ? $1 : $2;
        last unless $v =~ /^[a-z][a-z0-9-]*$/;
        push @w, $v;
      }
      return @w;
    }
    sub emit { my @w = @_; return unless @w; $seen{join(" ", @w[0 .. ($#w > 2 ? 2 : $#w)])} = 1; }
    for my $file (@ARGV) {
      open(my $fh, "<", $file) or die "$file: $!";
      local $/; my $t = <$fh>; close $fh;
      my @decl;            # [offset, variable, literal words] of array initializers
      while ($t =~ /(?:\b(?:const|let|var)\s+)?\b(\w+)\s*(?::\s*[\w\[\]<>| ]+)?(?<![=!<>])=(?![=>])\s*(\[)?/g) {
        my ($v, $at, $arr) = ($1, pos($t), $2);
        push @decl, [$at, $v, [$arr ? words($t) : ()]];
        pos($t) = $at;
      }
      my $lookup = sub {   # literal words of the nearest declaration of $v before offset $p
        my ($v, $p) = @_; my @w;
        for my $d (@decl) { @w = @{ $d->[2] } if $d->[1] eq $v && $d->[0] < $p; }
        return @w;
      };
      # executeNselfCommand / streamNselfCommand
      while ($t =~ /(?<!function )\b(?:executeNselfCommand|streamNselfCommand)\(\s*(?![\x27"\s])/g) { $seen{"\@dynamic $file"} = 1; }
      while ($t =~ /\b(?:executeNselfCommand|streamNselfCommand)\(\s*(?:\x27([a-z][a-z0-9-]*)\x27|"([a-z][a-z0-9-]*)")/g) {
        my $cmd = defined $1 ? $1 : $2; my @w;
        if ($t =~ /\G\s*,\s*\[/gc) { @w = words($t); }
        elsif ($t =~ /\G\s*,\s*(\w+)\s*[,)]/gc) { @w = $lookup->($1, pos($t)); }
        emit($cmd, @w);
      }
      # execFile / spawn of the nself binary
      while ($t =~ /\b(?:execFileAsync|execFileSync|execFile|spawnSync|spawn)\(\s*(?:nselfPath|nselfCommand|nselfBin|nselfBinary|\x27nself\x27|"nself")\s*,\s*/g) {
        my @w;
        if ($t =~ /\G\[/gc) { @w = words($t); }
        elsif ($t =~ /\G(\w+)\s*[,)]/gc) { @w = $lookup->($1, pos($t)); }
        $seen{"\@dynamic $file"} = 1 unless @w;
        emit(@w);
      }
      # runCLI([...]) wrappers that prepend the nself binary
      while ($t =~ /\brunCLI\(\s*\[/g) { emit(words($t)); }
      # ${nselfPath} a b ...  and exec("nself a b ...")
      my @starts;
      while ($t =~ /\$\{(?:nselfPath|nselfCommand|nselfBin|nselfBinary)\}\s+/g) { push @starts, pos($t); }
      while ($t =~ /\bexec(?:Async|Sync)?\(\s*[`\x27"]nself\s+/g) { push @starts, pos($t); }
      for my $p (@starts) {
        pos($t) = $p; my @w;
        while ($t =~ /\G([a-z][a-z0-9-]*)(?=[\s`\x27"]|\$|$)\s*/gc) { push @w, $1; }
        $seen{"\@dynamic $file"} = 1 unless @w;
        emit(@w);
      }
    }
    print "$_\n" for sort keys %seen;
  
PERL_EOF

FILES="$WORK/files.txt"
(cd "$ROOT" && find -L src -type f \( -name '*.ts' -o -name '*.tsx' \) \
  ! -path '*/__tests__/*' ! -name '*.test.*' ! -name '*.spec.*' | sort) >"$FILES"
tr '\n' '\0' <"$FILES" | (cd "$ROOT" && xargs -0 perl -0777 -e "$PERL_PROG") | sort -u >"$INVENTORY"
FILE_COUNT="$(wc -l <"$FILES" | tr -d ' ')"
if [ "$FILE_COUNT" -eq 0 ] || [ ! -s "$INVENTORY" ]; then
  echo "cli-compat: FAIL: no source files or no argv prefixes found (is $ROOT/src missing or empty?)" >&2
  exit 1
fi
LINES="$(grep -vc '^@dynamic ' "$INVENTORY" || true)"
echo "cli-compat [$MODE] $BIN: read $FILE_COUNT source files, $LINES argv prefixes -> scripts/cli-argv-inventory.txt"

# ── 2. cli command tables ────────────────────────────────────────────────────

nself_run help --json >"$WORK/help.json" 2>/dev/null || { echo "cli-compat: nself help --json failed" >&2; exit 1; }
jq -r '.data.commands[].path | sub("^nself ";"")' "$WORK/help.json" | sort -u >"$WORK/paths.txt"
if ! NSELF_V15=1 nself_run help --json >"$WORK/help15.json" 2>/dev/null; then
  echo "cli-compat: FAIL: NSELF_V15=1 nself help --json failed, cannot read the v1.5 shims" >&2
  exit 1
fi
jq -r '.data.commands[] | select(.canon == "deprecated-shim") | [(.path | sub("^nself ";"")), ((.target // "") | sub("^nself ";""))] | @tsv' "$WORK/help15.json" \
  | sort -u >"$WORK/shims.tsv"
if [ ! -s "$WORK/shims.tsv" ]; then
  echo "cli-compat: FAIL: this cli lists no deprecated shims in v1.5 mode (no canon data), the old-spelling check would prove nothing" >&2
  exit 1
fi

# ── 3. checks ────────────────────────────────────────────────────────────────

FAIL=0
CHECKED=0
: >"$WORK/unknown.txt"
while IFS= read -r line; do
  [ -n "$line" ] || continue
  case "$line" in "@dynamic "*) continue ;; esac

  # old spelling: the prefix starts with a path that is only a shim in v1.5
  while IFS="$(printf '\t')" read -r old target; do
    case "$line" in
      "$old"|"$old "*)
        echo "FAIL old spelling: 'nself $line' starts with '$old' (use '${target:-the canonical spelling}')"
        FAIL=1
        ;;
    esac
  done <"$WORK/shims.tsv"

  # longest word run that is a command in this mode
  set -- $line
  n=$#
  found=""
  k=$n
  while [ "$k" -ge 1 ]; do
    cand="$(echo "$line" | cut -d' ' -f1-"$k")"
    if grep -Fxq -- "$cand" "$WORK/paths.txt"; then found="$cand"; break; fi
    k=$((k - 1))
  done
  if [ -z "$found" ]; then
    echo "$line" >>"$WORK/unknown.txt"
    continue
  fi
  [ "$found" = "$line" ] || echo "$line" >>"$WORK/unknown.txt"

  CHECKED=$((CHECKED + 1))
  # shellcheck disable=SC2086
  if ! out="$(nself_run $found --help 2>&1)"; then
    echo "FAIL exit: 'nself $found --help' exited non-zero"
    FAIL=1
  elif printf '%s' "$out" | grep -q 'moved to'; then
    echo "FAIL shim: 'nself $found' prints a 'moved to' warning"
    FAIL=1
  fi
done <"$INVENTORY"

# Routes that run a user-chosen command must make its root canonical.
DYNAMIC_COUNT="$(grep -c '^@dynamic ' "$INVENTORY" || true)"
for guarded in src/app/api/cli/execute/route.ts src/app/api/commands/run/route.ts \
  src/app/api/nself/route.ts src/app/api/ws/terminal/route.ts; do
  if ! grep -qE 'canonicalizeArgs|canonicalizeArgv' "$ROOT/$guarded"; then
    echo "FAIL dynamic argv: $guarded runs a user-chosen command but does not call canonicalizeArgs"
    FAIL=1
  fi
done

UNKNOWN_COUNT="$(sort -u "$WORK/unknown.txt" | wc -l | tr -d ' ')"
echo "cli-compat [$MODE]: $DYNAMIC_COUNT files exec the cli with an argv not readable statically (@dynamic in the inventory)"
echo "cli-compat [$MODE]: $CHECKED commands run with --help, $UNKNOWN_COUNT prefixes not (fully) in this cli (UNKNOWN, pre-existing drift)"
sort -u "$WORK/unknown.txt" | sed 's/^/UNKNOWN nself /'

if [ "$FAIL" -ne 0 ]; then
  echo "cli-compat [$MODE]: FAIL"
  exit 1
fi
echo "cli-compat [$MODE]: PASS"
