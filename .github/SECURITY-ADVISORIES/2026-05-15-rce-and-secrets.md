# Security Advisory: Remote Code Execution via Unsanitized Shell Command Injection

**Advisory ID:** nself-admin-2026-05-15  
**Date:** 2026-05-15  
**Affected component:** nself-org/admin  
**Severity:** Critical  
**Fixed in:** v1.2.0  
**Chain ID:** a83c99d6  
**GitHub Security Advisory:** pending — published at tag time, not filed here

---

## Summary

The deployment environments API endpoint in nself-admin accepted user-controlled input and passed it to a shell command via `exec()` with string interpolation. An authenticated admin UI user could craft a request that caused the admin server to execute arbitrary OS commands. The fix replaces the string-interpolated `exec()` call with `execFile()` using a structured argv array, Zod schema validation, an identifier allowlist pattern, and an action enum.

---

## Affected versions

v1.1.x and earlier (any build before v1.2.0)

---

## Description

`admin/src/app/api/deployment/environments/route.ts` handled POST requests for environment management operations (create, diff, delete, list). The original implementation passed user-supplied values such as the environment name and action directly into a shell string executed via `exec()`. An attacker with access to a logged-in admin session — either by stealing a session token or by operating the admin UI directly — could supply a crafted environment name containing shell metacharacters (`;`, `$()`, `\``, `&&`, `|`) to escape the intended command context and execute arbitrary code on the host running `nself-admin`.

Because `nself-admin` runs locally on the operator's machine with the same OS privileges as the user who started it, successful exploitation gives an attacker full command execution under that account. The docker socket is accessible from this context, so further privilege escalation to root is feasible.

---

## Fix

The endpoint was hardened with multiple independent controls:

**Input validation:**

- `IDENTIFIER_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/` rejects any environment name that does not consist of lowercase alphanumerics and interior hyphens. This pattern explicitly rejects leading and trailing hyphens, preventing `--help`-style flag injection through the service name.
- `validateServiceName(environment)` (imported from `@/lib/validation/service-name`) enforces the same pattern before the value reaches the command builder.
- `EnvironmentActionSchema` (Zod) constrains the `action` field to a strict enum: `'create' | 'diff' | 'delete' | 'list'`. Any other value is rejected with a 400 before subprocess invocation.
- `KNOWN_TEMPLATES = ['default', 'minimal', 'dev', 'staging', 'prod'] as const` constrains the template parameter to a closed allowlist. Strings not in this list are rejected.

**subprocess hardening:**

- All calls use `execFile()` (from Node.js `child_process`) with an explicit argv array. No shell string is ever constructed or passed to `exec()`. Shell metacharacters in any argument cannot escape the subprocess because the OS exec system call receives a literal argv, not a shell command.
- A `'--'` end-of-options separator is inserted immediately before any user-controlled positional arguments in every argv array. This prevents an attacker from passing a value that looks like a CLI flag (e.g., `--format=json`), even after passing the identifier pattern check.

**Auth and CSRF:**

- `requireAuth(request)` is called before any processing. Unauthenticated requests receive a 401.
- The `GET` handler returns 405 Method Not Allowed, removing a CSRF attack surface where a malicious page could trigger state-changing operations via a browser's default GET fetch.

**Audit:**

- `appendAuditFile()` is called on both the success and the error path, logging who triggered the operation, what arguments were provided, and whether it succeeded.

---

## CVSS base score

CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H — **7.2 (High, elevated to Critical in context)**

The CVSS base score is 7.2 (High) because the attack requires high privileges (an authenticated admin session, PR:H). In practice this is rated Critical because:

- The admin UI is the only surface for managing production deployments, so any operator with legitimate access is a potential vector.
- Successful exploitation reaches the docker socket, making host-level root escalation straightforward.
- `nself-admin` is designed to run on the operator's local machine, meaning exploitation requires only a stolen or shared session, not a network-facing attack.

---

## Impact

An authenticated attacker can execute arbitrary OS commands on the machine running `nself-admin`. This includes reading secrets from environment files, accessing private keys, and escalating privileges via the docker socket.

---

## Workaround (before upgrading)

There is no safe workaround short of not running `nself-admin`. The endpoint is part of the normal deployment workflow. Operators who cannot upgrade immediately should ensure only trusted accounts have access to the machine and port where `nself-admin` runs (default `localhost:3021`). Restrict access to `localhost` only — do not expose the admin port on any network interface.

---

## Remediation

Upgrade to v1.2.0 or later.

```sh
nself admin update
# or rebuild from source at v1.2.0+
```

---

## Credit

Chain ID: a83c99d6 (external report via nSelf PCI inbox, 2026-05-15). No CVE has been assigned. A GitHub Security Advisory draft will be published at v1.2.0 tag time.

---

## See Also

- [[Architecture]] — admin system architecture and security boundary documentation
- `admin/src/app/api/deployment/environments/route.ts` — the patched endpoint
- `admin/src/lib/validation/service-name.ts` — the identifier validation helper
