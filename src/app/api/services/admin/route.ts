import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/services/admin
 * Lists admin-managed services via nself service admin
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['admin'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list admin services',
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
        error: 'Failed to list admin services',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
