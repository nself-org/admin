/**
 * Rollback an applied schema migration job
 * Executes the stored reverseDDL via nself CLI
 * SP-13.B20
 */

import { getDb } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

// R3: execFile — argv array, no /bin/sh, no string interpolation
const execFilePromise = promisify(execFile)

function getJobsCollection() {
  const db = getDb()
  return (
    db.getCollection('schema_jobs') ??
    db.addCollection('schema_jobs', { indices: ['id', 'status'] })
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  try {
    const col = getJobsCollection()
    const job = col.findOne({ id })

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'applied') {
      return NextResponse.json(
        {
          success: false,
          error: `Job cannot be rolled back (current status: ${job.status})`,
        },
        { status: 409 }
      )
    }

    if (!(job.reverseDDL as string)?.trim()) {
      return NextResponse.json(
        { success: false, error: 'No reverseDDL stored for this job' },
        { status: 422 }
      )
    }

    // R3: Execute DDL via nself CLI — argv array, no shell, no string interpolation
    let output = ''
    let rollbackError: string | undefined

    try {
      const result = await execFilePromise(
        'nself',
        ['db', 'query', '--sql', job.reverseDDL as string],
        { timeout: 30000 }
      )
      output = result.stdout
    } catch (err) {
      const execErr = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string }
      output = execErr.stdout ?? ''
      const stderrPart = execErr.stderr ? ` | stderr: ${execErr.stderr}` : ''
      rollbackError = execErr.message ? `${execErr.message}${stderrPart}` : 'CLI execution failed'
    }

    if (rollbackError) {
      return NextResponse.json({ success: false, error: rollbackError, output }, { status: 500 })
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
      { status: 500 }
    )
  }
}
