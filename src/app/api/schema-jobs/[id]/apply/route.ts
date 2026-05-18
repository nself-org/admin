/**
 * Apply a pending schema migration job via nself CLI
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

    if (job.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `Job is not pending (current status: ${job.status})`,
        },
        { status: 409 }
      )
    }

    // R3: Execute DDL via nself CLI — argv array, no shell, no string interpolation
    let output = ''
    let applyError: string | undefined

    try {
      const result = await execFilePromise(
        'nself',
        ['db', 'query', '--sql', job.forwardDDL as string],
        { timeout: 30000 }
      )
      output = result.stdout
    } catch (err) {
      // execFile puts stderr in err.stderr when shell=false; combine for caller
      const execErr = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string }
      output = execErr.stdout ?? ''
      const stderrPart = execErr.stderr ? ` | stderr: ${execErr.stderr}` : ''
      applyError = execErr.message ? `${execErr.message}${stderrPart}` : 'CLI execution failed'
    }

    if (applyError) {
      col.findAndUpdate({ id }, (j: Record<string, unknown>) => {
        j.status = 'failed'
        j.error = applyError
      })
      return NextResponse.json({ success: false, error: applyError, output }, { status: 500 })
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
      { status: 500 }
    )
  }
}
