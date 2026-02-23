import * as reports from '@/lib/reports'
import { ReportStatus } from '@/types/report'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/reports/executions - List all report executions
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId') || undefined
    const status = searchParams.get('status') as ReportStatus | undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined

    const executions = await reports.getExecutions({
      reportId,
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      data: executions,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list executions',
      },
      { status: 500 },
    )
  }
}
