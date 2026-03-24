/**
 * AWS Connection API
 *
 * AWS cloud provisioning is not yet implemented.
 * This route returns 501 until the feature is built.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'AWS cloud provisioning not yet available', status: 501 },
    { status: 501 },
  )
}
