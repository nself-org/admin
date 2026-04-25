import { requireAuth } from '@/lib/require-auth'
import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/workflows/[id]/pause
 * Pause a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params

    const workflow = await workflowsApi.pauseWorkflow(id)

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      workflow,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to pause workflow',
      },
      { status: 500 },
    )
  }
}
