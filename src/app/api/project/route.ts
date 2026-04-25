/**
 * GET  /api/project  — list all registered projects + active project id
 * POST /api/project  — register a new project
 */

import {
  addProject,
  loadProjects,
} from '@/features/project-picker/project-picker'
import type { ProjectPickerError } from '@/features/project-picker/types'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

// Name: 1–63 chars, letters / digits / hyphens / underscores
const SAFE_NAME_RE = /^[a-zA-Z0-9_-]{1,63}$/

// ---------------------------------------------------------------------------
// GET /api/project
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const store = await loadProjects()
    return NextResponse.json({
      projects: store.projects,
      activeProjectId: store.activeProjectId,
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load projects',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/project
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { name, path: projectPath } = body as Record<string, unknown>

  // Validate name
  if (typeof name !== 'string' || !SAFE_NAME_RE.test(name)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid name. Must be 1–63 characters: letters, digits, hyphens, underscores.',
      },
      { status: 400 },
    )
  }

  // Validate path
  if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'path must be a non-empty string' },
      { status: 400 },
    )
  }

  try {
    const project = await addProject(name, projectPath.trim())
    return NextResponse.json({ project }, { status: 201 })
  } catch (err) {
    const pickerErr = err as ProjectPickerError
    if (pickerErr.code !== undefined) {
      const statusMap: Record<ProjectPickerError['code'], number> = {
        INVALID_PATH: 422,
        DUPLICATE: 409,
        MAX_PROJECTS: 409,
        NOT_FOUND: 404,
        IO_ERROR: 500,
      }
      return NextResponse.json(
        {
          success: false,
          error: pickerErr.message,
          details: pickerErr.details,
          code: pickerErr.code,
        },
        { status: statusMap[pickerErr.code] ?? 500 },
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add project',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
