import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/workflows/[id]
 * Get a single workflow by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params

    const workflow = await workflowsApi.getWorkflowById(id)

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
          error instanceof Error ? error.message : 'Failed to get workflow',
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/workflows/[id]
 * Update a workflow
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()

    const workflow = await workflowsApi.updateWorkflow(id, {
      name: body.name,
      description: body.description,
      triggers: body.triggers,
      actions: body.actions,
      connections: body.connections,
      variables: body.variables,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      timeout: body.timeout,
      maxConcurrency: body.maxConcurrency,
    })

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
          error instanceof Error ? error.message : 'Failed to update workflow',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/workflows/[id]
 * Delete a workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params

    const deleted = await workflowsApi.deleteWorkflow(id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete workflow',
      },
      { status: 500 },
    )
  }
}
