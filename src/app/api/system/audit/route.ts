import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const entries = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'login',
        resource: '/auth/login',
        result: 'success',
        ipAddress: '192.168.1.100',
      },
    ]

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
