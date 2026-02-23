import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['email', 'template'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list email templates',
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
        error: 'Failed to list email templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
