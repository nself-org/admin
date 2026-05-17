import { executeNselfCommand } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

// SMTP env keys managed by this route
const SMTP_KEYS = [
  'AUTH_SMTP_HOST',
  'AUTH_SMTP_PORT',
  'AUTH_SMTP_SECURE',
  'AUTH_SMTP_USER',
  'AUTH_SMTP_PASS',
  'AUTH_SMTP_SENDER',
] as const

/** Parse env file → key/value map. */
function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      vars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
    }
  }
  return vars
}

/** Write/update specific env keys in-place, preserving unrelated lines. */
async function writeEnvKeys(
  filePath: string,
  updates: Record<string, string>,
): Promise<void> {
  let content = ''
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {
    // file missing — start fresh
  }

  const lines = content.split('\n')
  const written = new Set<string>()

  const newLines = lines.map((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed) return line
    const match = trimmed.match(/^([^=]+)=/)
    if (!match) return line
    const key = match[1].trim()
    if (key in updates) {
      written.add(key)
      const val = updates[key]
      return `${key}=${val.includes(' ') || val.includes('#') ? `"${val}"` : val}`
    }
    return line
  })

  for (const [key, val] of Object.entries(updates)) {
    if (!written.has(key)) {
      newLines.push(
        `${key}=${val.includes(' ') || val.includes('#') ? `"${val}"` : val}`,
      )
    }
  }

  await fs.writeFile(filePath, newLines.join('\n'), 'utf-8')
}

/** Check if a key holds a secret value (mask on read). */
function isSecret(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    lower.includes('password') ||
    lower.includes('secret') ||
    lower.includes('key') ||
    lower.includes('pass')
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  try {
    const backendPath = getProjectPath()
    const envFile = path.join(backendPath, '.env.dev')

    if (!path.resolve(envFile).startsWith(path.resolve(backendPath))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    let vars: Record<string, string> = {}
    try {
      const content = await fs.readFile(envFile, 'utf-8')
      vars = parseEnvFile(content)
    } catch {
      // env file missing — return defaults
    }

    // Mask secret values — never return plaintext password over API
    const smtp = {
      host: vars['AUTH_SMTP_HOST'] || 'mailpit',
      port: vars['AUTH_SMTP_PORT'] || '1025',
      secure: vars['AUTH_SMTP_SECURE'] || 'false',
      user: vars['AUTH_SMTP_USER'] || '',
      pass: vars['AUTH_SMTP_PASS'] ? '••••••••' : '',
      sender: vars['AUTH_SMTP_SENDER'] || 'noreply@nself.local',
      hasPass: Boolean(vars['AUTH_SMTP_PASS']),
    }

    return NextResponse.json({ success: true, smtp })
  } catch (error) {
    console.error('[email/route] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read email configuration' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  try {
    const body = await request.json()
    const { action, host, port, secure, user, pass, sender } = body as {
      action?: string
      host?: string
      port?: string
      secure?: string
      user?: string
      pass?: string
      sender?: string
    }

    const backendPath = getProjectPath()
    const envFile = path.join(backendPath, '.env.dev')

    if (!path.resolve(envFile).startsWith(path.resolve(backendPath))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    // Test email action — delegates to CLI plugin test
    if (action === 'test') {
      const result = await executeNselfCommand('plugin', ['test', 'transactional-email'], {})
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test email sent successfully' : 'Test email failed',
        output: result.stdout || result.error || '',
      })
    }

    // Save SMTP config
    const updates: Record<string, string> = {}
    if (host !== undefined) updates['AUTH_SMTP_HOST'] = host
    if (port !== undefined) updates['AUTH_SMTP_PORT'] = port
    if (secure !== undefined) updates['AUTH_SMTP_SECURE'] = secure
    if (user !== undefined) updates['AUTH_SMTP_USER'] = user
    // Only write pass if it's not the placeholder mask
    if (pass !== undefined && pass !== '••••••••') {
      updates['AUTH_SMTP_PASS'] = pass
    }
    if (sender !== undefined) updates['AUTH_SMTP_SENDER'] = sender

    await writeEnvKeys(envFile, updates)

    return NextResponse.json({
      success: true,
      message: 'Email configuration saved',
    })
  } catch (error) {
    console.error('[email/route] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save email configuration' },
      { status: 500 },
    )
  }
}
