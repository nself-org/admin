// Multi-user Roles API — NOT available in v1.0.9.
// Multi-user Admin (including role management) is planned for v1.2.0 (Q3 2026 target).
// This route returns HTTP 404 with a structured error so callers get a clear
// machine-parseable signal instead of a 500 from a non-existent CLI command.
//
// When NSELF_ADMIN_MULTIUSER=true, the middleware still routes here — the
// 404 response is intentional: the feature is not wired at the API layer
// in v1.0.9 / v1.1.0 regardless of the flag. The flag only controls UI visibility.
//
// CLI commands `nself auth roles list` and `nself auth roles create` do NOT exist
// in v1.0.9. Do NOT revert to executeNselfCommand() calls here until they do.

import { NextResponse } from 'next/server'

const NOT_AVAILABLE = NextResponse.json(
  {
    error: 'not_available',
    message:
      'Multi-user mode disabled. Set NSELF_ADMIN_MULTIUSER=true to enable.',
    docs: 'https://docs.nself.org/admin/single-user-posture',
  },
  { status: 404 },
)

export async function GET(): Promise<NextResponse> {
  return NOT_AVAILABLE
}

export async function POST(): Promise<NextResponse> {
  return NOT_AVAILABLE
}
