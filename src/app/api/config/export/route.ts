import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/config/export
 * Export configuration for a given environment and format
 * Body: { environment: string, format: 'json' | 'yaml' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { environment, format } = body

    if (!environment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Environment is required',
        },
        { status: 400 },
      )
    }

    const allowedEnvs = ['local', 'dev', 'stage', 'prod']
    if (!allowedEnvs.includes(environment)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid environment. Allowed: ${allowedEnvs.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const exportFormat = format === 'yaml' ? 'yaml' : 'json'

    const result = await executeNselfCommand(
      'config',
      ['export', `--env=${environment}`, `--format=${exportFormat}`],
      { timeout: 15000 },
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Config export failed',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        environment,
        format: exportFormat,
        content: result.stdout || '',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Config export failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
