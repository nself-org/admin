import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/services/mlflow/models
 * Lists MLflow registered models via nself service mlflow models
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['mlflow', 'models'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list MLflow models',
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
        error: 'Failed to list MLflow models',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
