import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { bucket, provider } = body as {
      bucket?: string
      provider?: string
    }

    const args = ['storage', 'init']
    if (bucket) {
      if (!/^[a-zA-Z0-9._-]+$/.test(bucket)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid bucket name. Only letters, numbers, dots, hyphens, and underscores are allowed.',
          },
          { status: 400 },
        )
      }
      args.push(`--bucket=${bucket}`)
    }
    if (provider) {
      args.push(`--provider=${provider}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initialize storage',
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
        error: 'Failed to initialize storage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
