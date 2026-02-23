import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/workflows/[id]/activate
 * Activate a workflow
 */
export async function POST(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params

    const workflow = await workflowsApi.activateWorkflow(id)

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
          error instanceof Error
            ? error.message
            : 'Failed to activate workflow',
      },
      { status: 500 },
    )
  }
}
