import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/services/functions/invoke
 * Invokes a function via nself service functions invoke --name=<name>
 * Body: { name: string, payload?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name, payload } = body as {
      name?: string
      payload?: string
    }

    // Validate function name
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Function name is required' },
        { status: 400 },
      )
    }

    // Sanitize name: only allow alphanumeric, hyphens, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid function name. Only alphanumeric characters, hyphens, and underscores are allowed.',
        },
        { status: 400 },
      )
    }

    const args = ['functions', 'invoke', `--name=${name}`]

    if (payload && typeof payload === 'string') {
      args.push(`--payload=${payload}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to invoke function',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { name, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invoke function',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
