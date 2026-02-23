import * as workflowsApi from '@/lib/workflows'
import { NextResponse } from 'next/server'

/**
 * GET /api/workflows/stats
 * Get workflow statistics
 */
export async function GET(): Promise<NextResponse> {
  try {
    const stats = await workflowsApi.getWorkflowStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get workflow stats',
      },
      { status: 500 },
    )
  }
}
