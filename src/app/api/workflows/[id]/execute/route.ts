import * as workflowsApi from '@/lib/workflows'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/workflows/[id]/execute
 * Execute a workflow
 */
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()

    const execution = await workflowsApi.executeWorkflow({
      workflowId: id,
      input: body.input,
      variables: body.variables,
      async: body.async,
    })

    return NextResponse.json(
      {
        success: true,
        execution,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to execute workflow',
      },
      { status: 500 },
    )
  }
}
