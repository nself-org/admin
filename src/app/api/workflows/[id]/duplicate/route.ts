import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/workflows/[id]/duplicate
 * Duplicate a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const workflow = await workflowsApi.duplicateWorkflow(id, {
      name: body.name,
      createdBy: body.createdBy || 'admin',
    })

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        workflow,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to duplicate workflow',
      },
      { status: 500 },
    )
  }
}
