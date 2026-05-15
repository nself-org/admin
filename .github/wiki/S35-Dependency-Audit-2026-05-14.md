# admin/ Dependency Audit — P102 S35

**Date:** 2026-05-14
**Scope:** `admin/` repo only (separate git repo `nself-org/admin`)
**Tool:** `pnpm audit` + `pnpm outdated` (pnpm@10.28.0, Node 24.6.0)

## Summary

| Severity | Count |
|---|---|
| Critical | **0** |
| High | **14** |
| Moderate | 12 |
| Low | 3 |
| Info | 0 |

Outdated direct dependencies: **44 of 45** (most are minor / patch behind; one major: TypeScript 5.9.3 → 6.0.3).

## High-Severity Findings (14)

All 14 are from three upstream packages:

### Next.js (8 advisories)
Pinned at `^16.2.4`; current latest is `16.2.6`.

| Advisory | Title |
|---|---|
| 1117930 | Next.js Vulnerable to Denial of Service with Server Components |
| 1118938 | Middleware / Proxy bypass in App Router via segment-prefetch routes (incomplete fix follow-up) |
| 1118949 | Denial of Service via connection exhaustion in apps using Cache Components |
| 1118953 | Server-side request forgery in apps using WebSocket upgrades |
| 1118955 | Middleware / Proxy bypass through dynamic route parameter injection |
| 1118959 | Middleware / Proxy bypass in App Router via segment-prefetch routes |
| 1118961 | Middleware / Proxy bypass in Pages Router apps using i18n |

**Remediation:** bump `next` and `eslint-config-next` to `16.2.6+`. admin/ uses App Router so the App Router middleware/proxy bypasses (1118938, 1118955, 1118959) are directly applicable. Server Components DoS (1117930) and Cache Components DoS (1118949) apply if those features are in use (verify before treating as N/A). WebSocket SSRF (1118953) applies — admin/ runs a custom socket.io server.

**Priority:** HIGH. File PCI for next-bundle CVE bump (single coordinated bump for next + eslint-config-next + @next/bundle-analyzer to 16.2.6+).

### protobufjs (5 advisories, all via `dockerode > protobufjs`)
admin/ does not depend on protobufjs directly. The transitive path is `.>dockerode>protobufjs`.

| Advisory | Title |
|---|---|
| 1118640 | Code injection through bytes field defaults in generated toObject code |
| 1118923 | (CVE listed under same module — unique advisory) |
| 1118925 | (same) |
| 1118927 | Code generation gadget after prototype pollution |
| 1118929 | Process-wide denial of service through unsafe option paths |
| 1118931 | Denial of service through unbounded protobuf recursion |

**Remediation:** dockerode 4.0.10 → 5.0.0 (major bump) likely resolves; verify the protobufjs version pulled in by dockerode@5. Alternatively a pnpm `overrides` entry for protobufjs to the patched version line.

**Priority:** MEDIUM. dockerode is used for Docker socket integration — major bump needs regression test on `docker exec`, container log streaming, image pull progress.

### fast-uri + fast-xml-builder (3 advisories)

| Advisory | Module | Title |
|---|---|---|
| 1117870 | fast-uri | Path traversal via percent-encoded dot segments |
| 1117884 | fast-uri | Host confusion via percent-encoded authority delimiters |
| 1118965 | fast-xml-builder | Attribute values with unwanted quotes bypass malicious attribute filter |

Both transitively pulled; not direct deps. Likely resolvable via `pnpm overrides` since admin's `pnpm.overrides` block already has `fast-xml-parser` pinned. Add `fast-uri` and `fast-xml-builder` overrides next.

**Priority:** MEDIUM (these are transitive XML/URI utilities; impact depends on call paths).

## Moderate (12) + Low (3)

Detail captured in raw `pnpm audit` output (see S35 sprint artifact log). Most are `postcss` related (Next 16 transitive) and resolved by the Next.js bump above.

## Outdated Direct Dependencies (notable)

| Package | Current | Latest | Risk |
|---|---|---|---|
| typescript | 5.9.3 | 6.0.3 | MAJOR — TypeScript 6 release; defer to P103 unless required by Next.js 16 features |
| @next/bundle-analyzer | 16.2.1 | 16.2.6 | LOW — should bump with Next.js |
| dockerode | 4.0.10 | 5.0.0 | MAJOR — see protobufjs section |
| eslint-config-next | 16.2.1 | 16.2.6 | LOW — bump with Next.js |
| next-intl | 4.9.1 | 4.12.0 | LOW — minor bump |
| sharp | 0.34.3 | 0.34.5 | LOW — patch |
| zustand | 5.0.12 | 5.0.13 | LOW — patch |

Remaining 37 outdated entries are patch-level bumps with no advisories.

## Action Items

1. **PCI to admin/.claude/inbox/ for Next.js 16.2.6 bump** — covers 8 of 14 highs (HIGH priority).
2. **PCI to admin/.claude/inbox/ for dockerode 5.0.0 major bump** — covers 5 of 14 highs via transitive protobufjs (MEDIUM priority).
3. **PCI to admin/.claude/inbox/ for transitive override** — `fast-uri` + `fast-xml-builder` (MEDIUM priority).
4. **Deferred to P103+**: TypeScript 6 major.
5. **Verified clean of zero CRITICAL findings** — no immediate vault rotation or service revocation needed.

## Verification Method

```bash
cd /Volumes/X9/Sites/nself/admin
pnpm audit --json   # detailed CVE list
pnpm outdated       # outdated direct deps
```

Re-run after each PCI lands to confirm count moves from 14 → 6 → 1 → 0 high.

## Cross-Reference

- ADR-003: `admin/.github/wiki/ADR-003-nextjs-permanent-exception.md`
- Sprint: `.claude/phases/current/p102-storm/sprints/S35-admin-nextjs-permanent-exception.md`
