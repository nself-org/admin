/**
 * Apply a pending schema migration job via nself CLI
 * SP-13.B20
 */

import { getDb } from '@/lib/database'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execPromise = promisify(exec)

function getJobsCollection() {
  const db = getDb()
  return (
    db.getCollection('schema_jobs') ??
    db.addCollection('schema_jobs', { indices: ['id', 'status'] })
  )
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params

  try {
    const col = getJobsCollection()
    const job = col.findOne({ id })

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 },
      )
    }

    if (job.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `Job is not pending (current status: ${job.status})`,
        },
        { status: 409 },
      )
    }

    // Execute DDL via nself db query CLI command
    const ddlEscaped = (job.forwardDDL as string).replace(/'/g, "'\\''")
    let output = ''
    let applyError: string | undefined

    try {
      const result = await execPromise(
        `nself db query --sql '${ddlEscaped}' 2>&1`,
        { timeout: 30000 },
      )
      output = result.stdout
    } catch (err) {
      applyError = err instanceof Error ? err.message : 'CLI execution failed'
    }

    if (applyError) {
      col.findAndUpdate({ id }, (j: Record<string, unknown>) => {
        j.status = 'failed'
        j.error = applyError
      })
      return NextResponse.json(
        { success: false, error: applyError, output },
        { status: 500 },
      )
    }

    col.findAndUpdate({ id }, (j: Record<string, unknown>) => {
      j.status = 'applied'
      j.appliedAt = new Date().toISOString()
      j.error = undefined
    })

    return NextResponse.json({ success: true, output })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply migration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
