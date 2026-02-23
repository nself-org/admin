import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/reports/generate - Generate a report
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.templateId) {
      return NextResponse.json(
        { success: false, error: 'templateId is required' },
        { status: 400 },
      )
    }

    if (!body.format) {
      return NextResponse.json(
        { success: false, error: 'format is required' },
        { status: 400 },
      )
    }

    // Validate format
    const validFormats = ['pdf', 'excel', 'csv', 'json', 'html']
    if (!validFormats.includes(body.format)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const execution = await reports.generateReport({
      templateId: body.templateId,
      format: body.format,
      filters: body.filters,
      sort: body.sort,
      parameters: body.parameters,
      email: body.email,
      recipients: body.recipients,
    })

    return NextResponse.json(
      {
        success: true,
        data: execution,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 },
    )
  }
}
