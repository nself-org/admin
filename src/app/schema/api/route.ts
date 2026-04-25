/**
 * Schema CRUD + SQL Emission API
 * SP-13.B20
 *
 * Unified endpoint for schema canvas state management and SQL emission.
 *
 * GET  /schema/api           — list recent migration jobs
 * POST /schema/api           — create job + emit forward/reverse DDL
 * POST /schema/api?emit=true — emit DDL without persisting a job
 *
 * The canonical apply/rollback endpoints remain at /api/schema-jobs/[id]/apply
 * and /api/schema-jobs/[id]/rollback (see those routes for execution logic).
 */

import { getDb } from '@/lib/database'
import type { CanvasState } from '@/lib/schema-builder'
import { generateForwardDDL, generateReverseDDL } from '@/lib/schema-builder'
import { emitMigrationFile, emitRollbackFile } from '@/lib/schema/sql-emitter'
import { NextRequest, NextResponse } from 'next/server'

function getJobsCollection() {
  const db = getDb()
  return (
    db.getCollection('schema_jobs') ??
    db.addCollection('schema_jobs', { indices: ['id', 'status'] })
  )
}

// ─── GET — list recent jobs ───────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const col = getJobsCollection()
    const jobs = col
      .chain()
      .simplesort('createdAt', true)
      .limit(50)
      .data()
      .map((j: Record<string, unknown>) => ({
        id: j.id as string,
        name: j.name as string,
        status: j.status as string,
        hasuraTracked: j.hasuraTracked as boolean,
        createdAt: j.createdAt as string,
        appliedAt: j.appliedAt as string | undefined,
        error: j.error as string | undefined,
      }))

    return NextResponse.json({ jobs })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list schema jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// ─── POST — create job + emit DDL ─────────────────────────────────────────────

interface SchemaApiBody {
  /** Optional canvas state to emit DDL from */
  canvas?: CanvasState
  /** Pre-generated forward DDL (if canvas not provided) */
  forwardDDL?: string
  /** Pre-generated reverse DDL (if canvas not provided) */
  reverseDDL?: string
  /** Human-readable migration label */
  name?: string
  /** If true: only emit DDL, do not persist a job record */
  emitOnly?: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const emitOnly = url.searchParams.get('emit') === 'true'

  try {
    const body = (await request.json()) as SchemaApiBody

    // Resolve DDL — either from a canvas state or from pre-generated strings
    let forwardDDL: string
    let reverseDDL: string

    if (body.canvas) {
      forwardDDL = generateForwardDDL(body.canvas)
      reverseDDL = generateReverseDDL(body.canvas)
    } else {
      forwardDDL = body.forwardDDL ?? ''
      reverseDDL = body.reverseDDL ?? ''
    }

    if (!forwardDDL.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'No DDL to emit — canvas is empty or forwardDDL is missing',
        },
        { status: 400 },
      )
    }

    const label = body.name ?? `migration_${Date.now()}`

    // Emit formatted SQL file bodies
    const forwardSql = emitMigrationFile(
      body.canvas ?? { tables: [], relationships: [] },
      label,
    )
    const reverseSql = emitRollbackFile(
      body.canvas ?? { tables: [], relationships: [] },
      label,
    )

    // Emit-only mode: return DDL without persisting
    if (emitOnly || body.emitOnly) {
      return NextResponse.json({
        success: true,
        emitOnly: true,
        forwardDDL,
        reverseDDL,
        forwardSql,
        reverseSql,
      })
    }

    // Persist job
    const col = getJobsCollection()
    const id = `sjob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const job = {
      id,
      name: label,
      status: 'pending',
      forwardDDL,
      reverseDDL,
      hasuraTracked: false,
      createdAt: new Date().toISOString(),
      appliedAt: undefined as string | undefined,
      error: undefined as string | undefined,
    }

    col.insert(job)

    return NextResponse.json(
      {
        success: true,
        id,
        name: label,
        forwardDDL,
        reverseDDL,
        forwardSql,
        reverseSql,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create schema job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
