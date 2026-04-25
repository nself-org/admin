import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse, NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const result = await executeNselfCommand('build')

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Build completed successfully',
        output: result.stdout,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Build failed',
          details: result.stderr || result.stdout || 'Unknown error',
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Build command failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
