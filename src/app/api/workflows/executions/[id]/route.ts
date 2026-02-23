import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/workflows/executions/[id]
 * Get a single workflow execution by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params

    const execution = await workflowsApi.getWorkflowExecution(id)

    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      execution,
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
