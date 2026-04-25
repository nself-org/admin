import { NextResponse, NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * Read/write plugin-scoped env vars. In a future sprint this will call
 * `nself plugin env get/set`. For now it returns an empty object on GET
 * and accepts any shape on PUT.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params
  if (!/^[a-z0-9-]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid plugin name.' }, { status: 400 })
  }
  // Default starter keys — UI will show these as editable fields.
  const starters: Record<string, Record<string, string>> = {
    notify: {
      NOTIFY_EMAIL_PROVIDER: 'mailgun',
      NOTIFY_EMAIL_FROM: 'no-reply@example.com',
    },
    cron: {
      CRON_TIMEZONE: 'UTC',
    },
    ai: {
      AI_PROVIDER: 'anthropic',
      AI_MODEL: 'claude-opus-4',
    },
  }
  return NextResponse.json({ env: starters[name] ?? {} })
}

export async function PUT(
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
    const body = (await request.json()) as { env: Record<string, string> }
    if (typeof body.env !== 'object' || body.env === null) {
      return NextResponse.json(
        { error: 'env must be an object.' },
        { status: 400 },
      )
    }
    return NextResponse.json({
      success: true,
      plugin: name,
      saved: Object.keys(body.env).length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
