import { readEnvFile } from '@/lib/env-handler'
import { NextResponse } from 'next/server'

// Keys whose values must be redacted before leaving the server.
// This route is intentionally public so the wizard can bootstrap — but it
// must never return actual secret material to the browser.
const SECRET_KEY_PATTERN =
  /SECRET|PASSWORD|KEY|TOKEN|PRIVATE|CREDENTIAL|AUTH|CERT|SEED/i

function redactSecrets(
  env: Record<string, string>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(env)) {
    out[k] = SECRET_KEY_PATTERN.test(k) ? null : v
  }
  return out
}

export async function GET(): Promise<NextResponse> {
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
