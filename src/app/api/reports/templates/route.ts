import * as reports from '@/lib/reports'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/reports/templates - List all report templates
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || undefined

    const templates = await reports.getTemplates(tenantId)

    return NextResponse.json({
      success: true,
      data: templates,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list templates',
      },
      { status: 500 },
    )
  }
}

// POST /api/reports/templates - Create a new report template
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 },
      )
    }
    if (!body.category) {
      return NextResponse.json(
        { success: false, error: 'category is required' },
        { status: 400 },
      )
    }
    if (!body.dataSource) {
      return NextResponse.json(
        { success: false, error: 'dataSource is required' },
        { status: 400 },
      )
    }
    if (!body.columns || !Array.isArray(body.columns)) {
      return NextResponse.json(
        { success: false, error: 'columns array is required' },
        { status: 400 },
      )
    }
    if (!body.createdBy) {
      return NextResponse.json(
        { success: false, error: 'createdBy is required' },
        { status: 400 },
      )
    }

    const template = await reports.createTemplate({
      name: body.name,
      description: body.description,
      category: body.category,
      dataSource: body.dataSource,
      columns: body.columns,
      defaultFilters: body.defaultFilters,
      defaultSort: body.defaultSort,
      visualization: body.visualization,
      tenantId: body.tenantId,
      createdBy: body.createdBy,
    })

    return NextResponse.json(
      {
        success: true,
        data: template,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 },
    )
  }
}
