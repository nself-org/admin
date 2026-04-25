import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/services/init
 * Initializes a new service via nself service init --name=<name>
 * Body: { name: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 },
      )
    }

    // Validate service name (alphanumeric, hyphens, underscores)
    const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/
    if (!namePattern.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Service name must start with a letter and contain only letters, numbers, hyphens, and underscores (max 64 chars)',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('service', [
      'init',
      `--name=${name}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to initialize service: ${name}`,
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
        error: 'Failed to initialize service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
