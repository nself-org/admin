import * as workflowsApi from '@/lib/workflows'
import type { WorkflowExecutionStatus } from '@/types/workflow'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workflows/executions
 * List all workflow executions with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const status = searchParams.get('status') as WorkflowExecutionStatus | null
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const orderBy = searchParams.get('orderBy') as
      | 'startedAt'
      | 'completedAt'
      | null
    const orderDir = searchParams.get('orderDir') as 'asc' | 'desc' | null

    const executions = await workflowsApi.getWorkflowExecutions({
      workflowId: workflowId || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      orderBy: orderBy || undefined,
      orderDir: orderDir || undefined,
    })

    return NextResponse.json({
      success: true,
      executions,
      count: executions.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get workflow executions',
      },
      { status: 500 },
    )
  }
}
