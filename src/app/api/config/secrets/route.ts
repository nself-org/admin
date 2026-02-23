import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/config/secrets
 * List all secrets by wrapping `nself config secrets list`
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const env = searchParams.get('env')

    const args = ['secrets', 'list']
    if (env) args.push('--env', env)

    const result = await executeNselfCommand('config', args)

    if (result.success) {
      let secrets = []
      try {
        secrets = JSON.parse(result.stdout || '[]')
      } catch {
        // Parse line-by-line output (KEY=VALUE or KEY format)
        const lines = (result.stdout || '')
          .trim()
          .split('\n')
          .filter((line: string) => line.trim())
        secrets = lines.map((line: string) => {
          const eqIndex = line.indexOf('=')
          if (eqIndex !== -1) {
            return {
              key: line.substring(0, eqIndex).trim(),
              value: line.substring(eqIndex + 1).trim(),
              masked: true,
            }
          }
          return { key: line.trim(), value: '********', masked: true }
        })
      }

      return NextResponse.json({
        success: true,
        data: { secrets },
      })
    }

    return NextResponse.json({
      success: true,
      data: { secrets: [] },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list secrets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/config/secrets
 * Set a secret by wrapping `nself config secrets set [key] [value]`
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { key, value, env } = body as {
      key?: string
      value?: string
      env?: string
    }

    if (!key || !value) {
      return NextResponse.json(
        {
          success: false,
          error: 'Key and value are required',
        },
        { status: 400 },
      )
    }

    // Validate key format (alphanumeric, underscores, hyphens)
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid key format. Use letters, numbers, underscores, and hyphens.',
        },
        { status: 400 },
      )
    }

    const args = ['secrets', 'set', key, value]
    if (env) args.push('--env', env)

    const result = await executeNselfCommand('config', args)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: `Secret '${key}' set successfully`,
          output: result.stdout?.trim(),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: `Failed to set secret '${key}'`,
        details: result.stderr || result.error || 'Unknown error',
      },
      { status: 500 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
