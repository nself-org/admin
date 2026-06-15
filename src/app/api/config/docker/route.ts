import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

// Docker-related env keys surfaced by this route
const DOCKER_KEY_PREFIXES = [
  'POSTGRES_VERSION',
  'HASURA_VERSION',
  'AUTH_VERSION',
  'STORAGE_VERSION',
  'NGINX_VERSION',
  'REDIS_VERSION',
  'MAILPIT_VERSION',
]

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
      return `${key}=${val.includes(' ') ? `"${val}"` : val}`
    }
    return line
  })

  for (const [key, val] of Object.entries(updates)) {
    if (!written.has(key)) {
      newLines.push(`${key}=${val.includes(' ') ? `"${val}"` : val}`)
    }
  }

  await fs.writeFile(filePath, newLines.join('\n'), 'utf-8')
}

/** Return only docker-related vars (version tags and port mappings). */
function filterDockerVars(vars: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(vars)) {
    if (
      DOCKER_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
      key.endsWith('_PORT') ||
      key === 'NGINX_PORT' ||
      key === 'NGINX_SSL_PORT'
    ) {
      result[key] = val
    }
  }
  return result
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

    // Structured docker config
    const docker = {
      services: {
        postgres: {
          version: vars['POSTGRES_VERSION'] || '15',
          port: vars['POSTGRES_PORT'] || '5432',
        },
        hasura: { version: vars['HASURA_VERSION'] || 'latest' },
        auth: { version: vars['AUTH_VERSION'] || 'latest', port: vars['AUTH_PORT'] || '4000' },
        storage: { version: vars['STORAGE_VERSION'] || 'latest' },
        nginx: {
          version: vars['NGINX_VERSION'] || 'alpine',
          port: vars['NGINX_PORT'] || '80',
          sslPort: vars['NGINX_SSL_PORT'] || '443',
        },
        redis: { version: vars['REDIS_VERSION'] || '7-alpine', port: vars['REDIS_PORT'] || '6379' },
        mailpit: {
          version: vars['MAILPIT_VERSION'] || 'latest',
          uiPort: vars['MAILPIT_UI_PORT'] || '8025',
          smtpPort: vars['MAILPIT_SMTP_PORT'] || '1025',
        },
      },
      // All docker-relevant env vars for advanced view
      raw: filterDockerVars(vars),
    }

    return NextResponse.json({ success: true, docker })
  } catch (error) {
    console.error('[docker/route] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read Docker configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  try {
    const body = await request.json()
    const { updates } = body as { updates?: Record<string, string> }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'updates object is required' },
        { status: 400 }
      )
    }

    // Only allow docker-related keys to be updated through this route
    const allowedKeyPatterns = [
      /^POSTGRES_VERSION$/,
      /^HASURA_VERSION$/,
      /^AUTH_VERSION$/,
      /^STORAGE_VERSION$/,
      /^NGINX_VERSION$/,
      /^REDIS_VERSION$/,
      /^MAILPIT_VERSION$/,
      /^NGINX_PORT$/,
      /^NGINX_SSL_PORT$/,
      /^MAILPIT_UI_PORT$/,
      /^MAILPIT_SMTP_PORT$/,
    ]

    for (const key of Object.keys(updates)) {
      if (!allowedKeyPatterns.some((re) => re.test(key))) {
        return NextResponse.json(
          { success: false, error: `Key "${key}" is not a docker configuration key` },
          { status: 400 }
        )
      }
    }

    // Basic value validation — no shell injection
    for (const [key, val] of Object.entries(updates)) {
      if (typeof val !== 'string' || val.includes('\n') || val.includes('\r')) {
        return NextResponse.json(
          { success: false, error: `Invalid value for key "${key}"` },
          { status: 400 }
        )
      }
    }

    const backendPath = getProjectPath()
    const envFile = path.join(backendPath, '.env.dev')

    if (!path.resolve(envFile).startsWith(path.resolve(backendPath))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    await writeEnvKeys(envFile, updates)

    return NextResponse.json({
      success: true,
      message: 'Docker configuration saved. Run nself build to apply changes.',
    })
  } catch (error) {
    console.error('[docker/route] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save Docker configuration' },
      { status: 500 }
    )
  }
}
