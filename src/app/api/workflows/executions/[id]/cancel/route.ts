import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/workflows/executions/[id]/cancel
 * Cancel a running or pending workflow execution
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params

    const execution = await workflowsApi.cancelExecution(id)

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
          error instanceof Error ? error.message : 'Failed to cancel execution',
      },
      { status: 500 },
    )
  }
}
