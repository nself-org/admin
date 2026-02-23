import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/config/vault/config
 * Configure Vault connection settings by wrapping `nself config vault config`
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { url, token, namespace } = body as {
      url?: string
      token?: string
      namespace?: string
    }

    const args = ['vault', 'config']
    if (url) args.push('--url', url)
    if (token) args.push('--token', token)
    if (namespace) args.push('--namespace', namespace)

    const result = await executeNselfCommand('config', args, {
      timeout: 30000,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Vault configuration updated successfully',
          output: result.stdout?.trim(),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to configure Vault',
        details: result.stderr || result.error || 'Unknown error',
      },
      { status: 500 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to configure Vault',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
