import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/services/functions/delete?name=<fn>
 * Deletes a deployed function via `nself functions delete <name> --confirm`
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name') ?? ''

    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing function name' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('functions', [
      'delete',
      name,
      '--confirm',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete function',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { name, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete function',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
