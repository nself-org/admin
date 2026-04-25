/**
 * POST /api/settings/credentials  — adds or updates a credential entry.
 * DELETE /api/settings/credentials — removes a credential entry by key.
 *
 * Key must match /^[A-Z_][A-Z0-9_]{0,127}$/.
 * Never log request bodies from this route — they contain credential values.
 */

import {
  removeCredential,
  updateCredential,
} from '@/features/settings/settings'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/** Regex for valid env var key names. Must match settings.ts assertValidKey. */
const ENV_KEY_RE = /^[A-Z_][A-Z0-9_]{0,127}$/

function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && ENV_KEY_RE.test(key)
}

// ---------------------------------------------------------------------------
// POST /api/settings/credentials
// Body: { key: string, value: string, description?: string }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Request body must be an object' },
      { status: 400 },
    )
  }

  const { key, value, description } = body as Record<string, unknown>

  if (!isValidKey(key)) {
    return NextResponse.json(
      {
        error:
          'Invalid key. Must match /^[A-Z_][A-Z0-9_]{0,127}$/ (uppercase letters, digits, underscores; start with letter or underscore).',
      },
      { status: 400 },
    )
  }

  if (typeof value !== 'string' || value.length === 0) {
    return NextResponse.json(
      { error: 'value must be a non-empty string' },
      { status: 400 },
    )
  }

  if (description !== undefined && typeof description !== 'string') {
    return NextResponse.json(
      { error: 'description must be a string when provided' },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()
    await updateCredential(
      projectPath,
      key,
      value,
      typeof description === 'string' ? description : undefined,
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to update credential'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/settings/credentials
// Body: { key: string }
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Request body must be an object' },
      { status: 400 },
    )
  }

  const { key } = body as Record<string, unknown>

  if (!isValidKey(key)) {
    return NextResponse.json(
      {
        error:
          'Invalid key. Must match /^[A-Z_][A-Z0-9_]{0,127}$/ (uppercase letters, digits, underscores; start with letter or underscore).',
      },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()
    await removeCredential(projectPath, key)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to remove credential'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
