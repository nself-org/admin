// Multi-user Users API — NOT available in v1.0.9.
// Admin is single-operator in v1.x. The single password authenticates one
// operator with full access; there are no roles, no per-user MFA enrollment,
// no multi-tenant separation in the Admin UI itself.
//
// Multi-user Admin is planned for v1.2.0 (Q3 2026 target).
// CLI commands `nself user list`, `nself user invite`, `nself user role`,
// `nself user mfa-reset`, and `nself user remove` do NOT exist in v1.0.9.
//
// All handlers return HTTP 404 with a structured error body so callers get a
// machine-parseable signal instead of a 500 from a non-existent CLI command.

import { NextResponse, NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  return NOT_AVAILABLE
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  return NOT_AVAILABLE
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  return NOT_AVAILABLE
}
