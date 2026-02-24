import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/reports/executions/[id] - Get a single execution
export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const execution = await reports.getExecutionById(id)

    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: execution,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get execution',
      },
      { status: 500 },
    )
  }
}
