import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/reports/templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const template = await reports.getTemplateById(id)
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get template',
      },
      { status: statusCode },
    )
  }
}

// PATCH /api/reports/templates/[id] - Update a template
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = await request.json()

    const template = await reports.updateTemplate(id, {
      name: body.name,
      description: body.description,
      category: body.category,
      dataSource: body.dataSource,
      columns: body.columns,
      defaultFilters: body.defaultFilters,
      defaultSort: body.defaultSort,
      visualization: body.visualization,
      tenantId: body.tenantId,
    })

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update template',
      },
      { status: statusCode },
    )
  }
}

// DELETE /api/reports/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await context.params

    await reports.deleteTemplate(id)

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete template',
      },
      { status: statusCode },
    )
  }
}
