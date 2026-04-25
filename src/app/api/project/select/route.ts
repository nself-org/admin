/**
 * POST /api/project/select — set the active project
 */

import { selectProject } from '@/features/project-picker/project-picker'
import type { ProjectPickerError } from '@/features/project-picker/types'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

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

  const { id } = body as Record<string, unknown>

  if (typeof id !== 'string' || id.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'id must be a non-empty string' },
      { status: 400 },
    )
  }

  try {
    const project = await selectProject(id.trim())
    return NextResponse.json({ project })
  } catch (err) {
    const pickerErr = err as ProjectPickerError
    if (pickerErr.code === 'NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: pickerErr.message,
          code: pickerErr.code,
        },
        { status: 404 },
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to select project',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
