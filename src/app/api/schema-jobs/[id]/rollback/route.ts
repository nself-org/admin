/**
 * Rollback an applied schema migration job
 * Executes the stored reverseDDL via nself CLI
 * SP-13.B20
 */

import { getDb } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

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

    if (job.status !== 'applied') {
      return NextResponse.json(
        {
          success: false,
          error: `Job cannot be rolled back (current status: ${job.status})`,
        },
        { status: 409 },
      )
    }

    if (!(job.reverseDDL as string)?.trim()) {
      return NextResponse.json(
        { success: false, error: 'No reverseDDL stored for this job' },
        { status: 422 },
      )
    }

    const ddlEscaped = (job.reverseDDL as string).replace(/'/g, "'\\''")
    let output = ''
    let rollbackError: string | undefined

    try {
      const result = await execPromise(
        `nself db query --sql '${ddlEscaped}' 2>&1`,
        { timeout: 30000 },
      )
      output = result.stdout
    } catch (err) {
      rollbackError =
        err instanceof Error ? err.message : 'CLI execution failed'
    }

    if (rollbackError) {
      return NextResponse.json(
        { success: false, error: rollbackError, output },
        { status: 500 },
      )
    }

    col.findAndUpdate({ id }, (j: Record<string, unknown>) => {
      j.status = 'rollback'
      j.error = undefined
    })

    return NextResponse.json({ success: true, output })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rollback migration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
