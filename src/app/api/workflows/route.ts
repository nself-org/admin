import * as workflowsApi from '@/lib/workflows'
import type { WorkflowStatus } from '@/types/workflow'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workflows
 * List all workflows with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as WorkflowStatus | null
    const tenantId = searchParams.get('tenantId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const workflows = await workflowsApi.getWorkflows({
      status: status || undefined,
      tenantId: tenantId || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })

    return NextResponse.json({
      success: true,
      workflows,
      count: workflows.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get workflows',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/workflows
 * Create a new workflow
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Workflow name is required' },
        { status: 400 },
      )
    }

    const workflow = await workflowsApi.createWorkflow({
      name: body.name,
      description: body.description,
      tenantId: body.tenantId,
      triggers: body.triggers,
      actions: body.actions,
      connections: body.connections,
      variables: body.variables,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      timeout: body.timeout,
      maxConcurrency: body.maxConcurrency,
      createdBy: body.createdBy || 'admin',
    })

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
          error instanceof Error ? error.message : 'Failed to create workflow',
      },
      { status: 500 },
    )
  }
}
