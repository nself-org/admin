import { getWidgetTemplates } from '@/lib/dashboards'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const templates = getWidgetTemplates()

    return NextResponse.json({
      success: true,
      templates,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch templates',
      },
      { status: 500 },
    )
  }
}
