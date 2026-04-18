import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params
  if (!/^[a-z0-9-]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid plugin name.' }, { status: 400 })
  }
  try {
    const result = await executeNselfCommand('plugin', ['disable', name])
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to revoke plugin',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ success: true, plugin: name, action: 'revoke' })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revoke plugin',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
