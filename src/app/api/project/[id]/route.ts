/**
 * DELETE /api/project/[id] — remove a registered project
 */

import { removeProject } from '@/features/project-picker/project-picker'
import type { ProjectPickerError } from '@/features/project-picker/types'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params

  if (typeof id !== 'string' || id.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Project id is required' },
      { status: 400 },
    )
  }

  try {
    await removeProject(id.trim())
    return NextResponse.json({ success: true })
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
        error: 'Failed to remove project',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
