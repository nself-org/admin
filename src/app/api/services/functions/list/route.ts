import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/services/functions/list
 * Lists all deployed functions via `nself functions list --json`
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('functions', ['list', '--json'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list functions',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    // Parse JSON output from `nself functions list --json`.
    let functions: unknown[] = []
    try {
      functions = JSON.parse(result.stdout?.trim() ?? '[]') as unknown[]
    } catch {
      // If the command returned no JSON (e.g. "No functions found"), return empty.
      functions = []
    }

    return NextResponse.json({
      success: true,
      data: { functions, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list functions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
