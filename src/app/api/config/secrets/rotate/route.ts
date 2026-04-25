import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/config/secrets/rotate
 * Rotate secrets by wrapping `nself config secrets rotate`
 * Can rotate a single key or all secrets
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { key, env } = body as {
      key?: string
      env?: string
    }

    const args = ['secrets', 'rotate']
    if (key) args.push(key)
    if (env) args.push('--env', env)

    const result = await executeNselfCommand('config', args, {
      timeout: 120000,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: key
            ? `Secret '${key}' rotated successfully`
            : 'All secrets rotated successfully',
          output: result.stdout?.trim(),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: key
          ? `Failed to rotate secret '${key}'`
          : 'Failed to rotate secrets',
        details: result.stderr || result.error || 'Unknown error',
      },
      { status: 500 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rotate secrets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
