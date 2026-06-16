import { executeNselfCommand } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

// Rate-limit env keys managed by this route (kept for reference)
const _RATE_LIMIT_KEYS = [
  'API_RATE_LIMIT_ENABLED',
  'API_RATE_LIMIT_REQUESTS',
  'API_RATE_LIMIT_WINDOW',
  'RATE_LIMIT_ENABLED',
  'RATE_LIMIT_MAX_REQUESTS',
  'RATE_LIMIT_WINDOW_SECONDS',
  'RATE_LIMIT_BURST',
] as const

/** Parse env file → key/value map. */
function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      vars[(match[1] ?? '').trim()] = (match[2] ?? '').trim().replace(/^["']|["']$/g, '')
    }
  }
  return vars
}

/** Write/update specific env keys in-place, preserving unrelated lines. */
async function writeEnvKeys(filePath: string, updates: Record<string, string>): Promise<void> {
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
    const key = (match[1] ?? '').trim()
    if (key in updates) {
      written.add(key)
      const val = updates[key] ?? ''
      return `${key}=${val}`
    }
    return line
  })

  for (const [key, val] of Object.entries(updates)) {
    if (!written.has(key)) {
      newLines.push(`${key}=${val}`)
    }
  }

  await fs.writeFile(filePath, newLines.join('\n'), 'utf-8')
}

/** Validate that a value is a positive integer string. */
function validatePositiveInt(val: string, fieldName: string): string | null {
  const n = parseInt(val, 10)
  if (isNaN(n) || n < 1 || String(n) !== val) {
    return `${fieldName} must be a positive integer`
  }
  return null
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
      // env file missing
    }

    const rateLimits = {
      // API-level limits (legacy keys)
      apiEnabled: vars['API_RATE_LIMIT_ENABLED'] ?? 'true',
      apiRequests: vars['API_RATE_LIMIT_REQUESTS'] ?? '100',
      apiWindow: vars['API_RATE_LIMIT_WINDOW'] ?? '60',
      // Nginx / global rate limits
      globalEnabled: vars['RATE_LIMIT_ENABLED'] ?? 'true',
      globalMaxRequests: vars['RATE_LIMIT_MAX_REQUESTS'] ?? '100',
      globalWindowSeconds: vars['RATE_LIMIT_WINDOW_SECONDS'] ?? '60',
      globalBurst: vars['RATE_LIMIT_BURST'] ?? '20',
    }

    return NextResponse.json({ success: true, rateLimits })
  } catch (error) {
    console.error('[rate-limits/route] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read rate limit configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  try {
    const body = await request.json()
    const {
      apiEnabled,
      apiRequests,
      apiWindow,
      globalEnabled,
      globalMaxRequests,
      globalWindowSeconds,
      globalBurst,
    } = body as {
      apiEnabled?: string
      apiRequests?: string
      apiWindow?: string
      globalEnabled?: string
      globalMaxRequests?: string
      globalWindowSeconds?: string
      globalBurst?: string
    }

    // Validate numeric fields
    if (apiRequests !== undefined) {
      const err = validatePositiveInt(apiRequests, 'API requests limit')
      if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
    }
    if (apiWindow !== undefined) {
      const err = validatePositiveInt(apiWindow, 'API window (seconds)')
      if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
    }
    if (globalMaxRequests !== undefined) {
      const err = validatePositiveInt(globalMaxRequests, 'Global max requests')
      if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
    }
    if (globalWindowSeconds !== undefined) {
      const err = validatePositiveInt(globalWindowSeconds, 'Global window (seconds)')
      if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
    }
    if (globalBurst !== undefined) {
      const err = validatePositiveInt(globalBurst, 'Burst limit')
      if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
    }

    const backendPath = getProjectPath()
    const envFile = path.join(backendPath, '.env.dev')

    if (!path.resolve(envFile).startsWith(path.resolve(backendPath))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (apiEnabled !== undefined) updates['API_RATE_LIMIT_ENABLED'] = apiEnabled
    if (apiRequests !== undefined) updates['API_RATE_LIMIT_REQUESTS'] = apiRequests
    if (apiWindow !== undefined) updates['API_RATE_LIMIT_WINDOW'] = apiWindow
    if (globalEnabled !== undefined) updates['RATE_LIMIT_ENABLED'] = globalEnabled
    if (globalMaxRequests !== undefined) updates['RATE_LIMIT_MAX_REQUESTS'] = globalMaxRequests
    if (globalWindowSeconds !== undefined)
      updates['RATE_LIMIT_WINDOW_SECONDS'] = globalWindowSeconds
    if (globalBurst !== undefined) updates['RATE_LIMIT_BURST'] = globalBurst

    await writeEnvKeys(envFile, updates)

    // Rebuild so nginx / rate-limit middleware picks up new values
    const buildResult = await executeNselfCommand('build', [], {})
    if (!buildResult.success) {
      console.warn('[rate-limits/route] nself build warning:', buildResult.error)
    }

    return NextResponse.json({
      success: true,
      message: 'Rate limit configuration saved',
      buildTriggered: true,
    })
  } catch (error) {
    console.error('[rate-limits/route] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save rate limit configuration' },
      { status: 500 }
    )
  }
}
