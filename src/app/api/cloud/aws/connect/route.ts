/**
 * AWS Connection API
 *
 * AWS cloud provisioning is not yet implemented.
 * This route returns 501 until the feature is built.
 */

import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  return NextResponse.json(
    { error: 'AWS cloud provisioning not yet available', status: 501 },
    { status: 501 },
  )
}
