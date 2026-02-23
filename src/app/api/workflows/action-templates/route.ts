import * as workflowsApi from '@/lib/workflows'
import { NextResponse } from 'next/server'

/**
 * GET /api/workflows/action-templates
 * Get all available action templates
 */
export async function GET(): Promise<NextResponse> {
  try {
    const templates = await workflowsApi.getActionTemplates()

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get action templates',
      },
      { status: 500 },
    )
  }
}
