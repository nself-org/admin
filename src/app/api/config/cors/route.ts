import { executeNselfCommand } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

// CORS-related env var keys managed by this route (kept for reference)
const _CORS_KEYS = [
  'CORS_ALLOWED_ORIGINS',
  'HASURA_GRAPHQL_CORS_DOMAIN',
  'AUTH_CLIENT_URL',
] as const

/** Parse an env file into a key→value map. */
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

/** Serialize a key→value map back to env-file format, preserving unrelated lines. */
async function writeEnvKeys(filePath: string, updates: Record<string, string>): Promise<void> {
  let content = ''
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {
    // file doesn't exist yet — start fresh
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
      return `${key}=${val.includes(' ') || val.includes('#') ? `"${val}"` : val}`
    }
    return line
  })

  // Append any keys not yet in the file
  for (const [key, val] of Object.entries(updates)) {
    if (!written.has(key)) {
      newLines.push(`${key}=${val.includes(' ') || val.includes('#') ? `"${val}"` : val}`)
    }
  }

  await fs.writeFile(filePath, newLines.join('\n'), 'utf-8')
}

/** Validate that all provided origins are well-formed URLs or the wildcard '*'. */
function validateOrigins(origins: string[]): string | null {
  for (const origin of origins) {
    if (origin === '*') continue
    try {
      const u = new URL(origin)
      if (!['http:', 'https:'].includes(u.protocol)) {
        return `Origin "${origin}" must use http or https`
      }
    } catch {
      return `"${origin}" is not a valid URL`
    }
  }
  return null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  try {
    const backendPath = getProjectPath()
    const envFile = path.join(backendPath, '.env.dev')

    // Path traversal guard
    if (!path.resolve(envFile).startsWith(path.resolve(backendPath))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    let vars: Record<string, string> = {}
    try {
      const content = await fs.readFile(envFile, 'utf-8')
      vars = parseEnvFile(content)
    } catch {
      // env file missing — return empty config
    }

    const cors = {
      allowedOrigins: vars['CORS_ALLOWED_ORIGINS'] || '',
      hasuraCors: vars['HASURA_GRAPHQL_CORS_DOMAIN'] || '*',
      authClientUrl: vars['AUTH_CLIENT_URL'] || '',
    }

    return NextResponse.json({ success: true, cors })
  } catch (error) {
    console.error('[cors/route] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read CORS configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  try {
    const body = await request.json()
    const { allowedOrigins, hasuraCors, authClientUrl } = body as {
      allowedOrigins?: string
      hasuraCors?: string
      authClientUrl?: string
    }

    // Validate origins list if provided
    if (allowedOrigins !== undefined) {
      const origins = allowedOrigins
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean)
      const err = validateOrigins(origins)
      if (err) {
        return NextResponse.json({ success: false, error: err }, { status: 400 })
      }
    }

    if (authClientUrl !== undefined && authClientUrl !== '') {
      try {
        const u = new URL(authClientUrl)
        if (!['http:', 'https:'].includes(u.protocol)) {
          return NextResponse.json(
            { success: false, error: 'AUTH_CLIENT_URL must use http or https' },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'AUTH_CLIENT_URL is not a valid URL' },
          { status: 400 }
        )
      }
    }

    const backendPath = getProjectPath()
    const envFile = path.join(backendPath, '.env.dev')

    // Path traversal guard
    if (!path.resolve(envFile).startsWith(path.resolve(backendPath))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (allowedOrigins !== undefined) updates['CORS_ALLOWED_ORIGINS'] = allowedOrigins
    if (hasuraCors !== undefined) updates['HASURA_GRAPHQL_CORS_DOMAIN'] = hasuraCors
    if (authClientUrl !== undefined) updates['AUTH_CLIENT_URL'] = authClientUrl

    await writeEnvKeys(envFile, updates)

    // Trigger rebuild so nginx/hasura pick up the new CORS config
    const buildResult = await executeNselfCommand('build', [], {})
    if (!buildResult.success) {
      console.warn('[cors/route] nself build warning:', buildResult.error)
    }

    return NextResponse.json({
      success: true,
      message: 'CORS configuration saved',
      buildTriggered: true,
      buildOutput: buildResult.stdout || '',
    })
  } catch (error) {
    console.error('[cors/route] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save CORS configuration' },
      { status: 500 }
    )
  }
}
