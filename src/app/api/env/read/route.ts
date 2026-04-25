import { readEnvFile } from '@/lib/env-handler'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/env/read
 *
 * Returns the current environment configuration for the admin UI.
 *
 * Security: requires an authenticated session (postSetupOnly=true). The
 * endpoint was previously public so the wizard could bootstrap, but wizard
 * routes now use /api/wizard/* directly. Unauthenticated callers receive 401.
 *
 * All keys matching the secret pattern are redacted to "***REDACTED***" —
 * the admin UI must never display raw secret material to the browser.
 *
 * Named keys that are always redacted regardless of pattern:
 *   HASURA_GRAPHQL_ADMIN_SECRET, MINIO_ROOT_PASSWORD, JWT_SECRET,
 *   JWT_SIGNING_KEY, NSELF_LICENSE_PRIVATE_KEY, POSTGRES_PASSWORD
 */

// Explicit redaction list — values are ALWAYS masked even if the pattern
// below changes in future. Add any additional secret key names here.
const ALWAYS_REDACT: ReadonlySet<string> = new Set([
  'HASURA_GRAPHQL_ADMIN_SECRET',
  'MINIO_ROOT_PASSWORD',
  'JWT_SECRET',
  'JWT_SIGNING_KEY',
  'NSELF_LICENSE_PRIVATE_KEY',
  'POSTGRES_PASSWORD',
  'ADMIN_PASSWORD',
  'ADMIN_PASSWORD_HASH',
])

// Pattern-based redaction: any key whose name matches gets redacted.
const SECRET_KEY_PATTERN =
  /SECRET|PASSWORD|KEY|TOKEN|PRIVATE|CREDENTIAL|AUTH|CERT|SEED/i

const REDACTED_VALUE = '***REDACTED***'

function redactSecrets(
  env: Record<string, string>,
): Record<string, string | typeof REDACTED_VALUE> {
  const out: Record<string, string | typeof REDACTED_VALUE> = {}
  for (const [k, v] of Object.entries(env)) {
    out[k] =
      ALWAYS_REDACT.has(k) || SECRET_KEY_PATTERN.test(k)
        ? REDACTED_VALUE
        : v
  }
  return out
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Require a valid session. This route is no longer open to the wizard;
  // wizard flows use /api/wizard/* with requireAuthPreSetup.
  const authError = await requireAuth(request, { csrf: false })
  if (authError) return authError

  try {
    const env = await readEnvFile()

    if (!env) {
      return NextResponse.json({ env: null }, { status: 200 })
    }

    return NextResponse.json({ env: redactSecrets(env) })
  } catch (error) {
    console.error('Error reading env file:', error)
    return NextResponse.json(
      {
        error: 'Failed to read env file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
