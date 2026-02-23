import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const prefix = searchParams.get('prefix')

    const args = ['storage', 'list']
    if (bucket) {
      args.push(`--bucket=${bucket}`)
    }
    if (prefix) {
      args.push(`--prefix=${prefix}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list storage objects',
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
        error: 'Failed to list storage objects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
