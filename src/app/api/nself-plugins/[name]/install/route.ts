import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const { name } = await context.params
  if (!/^[a-z0-9-]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid plugin name.' }, { status: 400 })
  }
  try {
    const result = await executeNselfCommand('plugin', ['install', name])
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to install plugin',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ success: true, plugin: name, action: 'install' })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to install plugin',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
