import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse, NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/config/vault/init
 * Initialize HashiCorp Vault by wrapping `nself config vault init`
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const result = await executeNselfCommand('config', ['vault', 'init'], {
      timeout: 120000,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Vault initialized successfully',
          output: result.stdout?.trim(),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Vault',
        details: result.stderr || result.error || 'Unknown error',
        output: result.stdout?.trim(),
      },
      { status: 500 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Vault',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
