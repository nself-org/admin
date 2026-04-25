// Multi-user Roles API — NOT available in v1.0.9.
// See /api/auth/roles/route.ts for full explanation.

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

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  return NOT_AVAILABLE
}
