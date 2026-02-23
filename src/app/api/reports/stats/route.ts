import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/reports/stats - Get report statistics
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const stats = await reports.getReportStats()

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get report stats',
      },
      { status: 500 },
    )
  }
}
