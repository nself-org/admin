import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/services/mlflow/ui
 * Gets MLflow UI URL and status via nself service mlflow ui
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['mlflow', 'ui'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get MLflow UI info',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get MLflow UI info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
