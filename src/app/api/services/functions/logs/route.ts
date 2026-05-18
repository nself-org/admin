import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/services/functions/logs?name=<fn>&tail=<n>
 * Retrieves function logs via `nself functions logs <name> --tail=<n>`
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name') ?? ''
    const tail = searchParams.get('tail') ?? '100'

    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing function name' },
        { status: 400 }
      )
    }

    const result = await executeNselfCommand('functions', ['logs', name, `--tail=${tail}`])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve function logs',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 }
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
        error: 'Failed to retrieve function logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
