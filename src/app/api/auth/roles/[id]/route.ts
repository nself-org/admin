// Multi-user Roles API — NOT available in v1.0.9.
// See /api/auth/roles/route.ts for full explanation.

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

export async function DELETE(): Promise<NextResponse> {
  return NOT_AVAILABLE
}
