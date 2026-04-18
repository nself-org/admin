/**
 * GET /api/settings  — returns the current AdminSettings for the active project.
 * PUT /api/settings  — replaces the full AdminSettings document.
 *
 * Settings are stored at {projectPath}/.nself/admin-settings.json.
 * Credential values are returned in full — this API is local-only (localhost:3021).
 * Never log request/response bodies from this route (they contain credential values).
 */

import { loadSettings, saveSettings } from '@/features/settings/settings'
import type { AdminSettings } from '@/features/settings/types'
import { getProjectPath } from '@/lib/paths'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const settings = await loadSettings(projectPath)
    return NextResponse.json(settings)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  // Minimal structural validation — enough to ensure we're not persisting garbage.
  if (!isAdminSettings(body)) {
    return NextResponse.json(
      { error: 'Request body does not match AdminSettings schema' },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()
    await saveSettings(projectPath, body)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to save settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isAdminSettings(value: unknown): value is AdminSettings {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  if (obj.version !== 1) return false
  if (!Array.isArray(obj.credentials)) return false
  if (!Array.isArray(obj.pluginKeys)) return false
  if (
    typeof obj.envVars !== 'object' ||
    obj.envVars === null ||
    Array.isArray(obj.envVars)
  )
    return false
  if (typeof obj.telemetry !== 'object' || obj.telemetry === null) return false
  const telemetry = obj.telemetry as Record<string, unknown>
  if (typeof telemetry.enabled !== 'boolean') return false
  if (obj.theme !== 'dark' && obj.theme !== 'system') return false
  if (!Array.isArray(obj.shortcuts)) return false

  return true
}
