import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/webhooks/[id]/rotate-secret
 * Secret rotation is not yet supported by the nself CLI. Returns 501 Not
 * Implemented so the page can call this route without crashing while clearly
 * communicating that the feature is pending CLI support.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const { id } = await params
  return NextResponse.json(
    {
      success: false,
      error: 'Secret rotation is not yet supported by the nself CLI',
      id,
    },
    { status: 501 }
  )
}
