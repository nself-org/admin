/**
 * Schema Jobs API — list and create migration jobs
 * SP-13.B20
 *
 * Jobs are stored in LokiJS (nadmin.db) under the 'schema_jobs' collection.
 * Each job has: id, name, status, forwardDDL, reverseDDL, hasuraTracked,
 *               createdAt, appliedAt, error
 *
 * R4/secfix2: Raw caller-supplied forwardDDL/reverseDDL in POST body are
 * rejected. DDL is always derived from a validated canvas via the hardened
 * schema-builder (R1 type allowlist + R2 typed defaults). Mirrors the R4
 * pattern established in schema/api/route.ts (S35-secfix).
 */

import { getDb } from '@/lib/database'
import type { CanvasState } from '@/lib/schema-builder'
import { generateForwardDDL, generateReverseDDL } from '@/lib/schema-builder'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

function getJobsCollection() {
  const db = getDb()
  return (
    db.getCollection('schema_jobs') ??
    db.addCollection('schema_jobs', {
      indices: ['id', 'status'],
    })
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

interface SchemaJobsBody {
  /** Canvas state to emit DDL from — REQUIRED (caller-supplied raw DDL is rejected) */
  canvas?: CanvasState
  /**
   * @deprecated R4/secfix2: Raw caller-supplied DDL is rejected. Always supply `canvas`.
   * These fields are ignored if present; retained in type for backward-compatible
   * JSON parsing (existing clients that send them receive a 400 with guidance).
   */
  forwardDDL?: string
  /** @deprecated R4/secfix2: see forwardDDL deprecation note */
  reverseDDL?: string
  /** Human-readable migration label */
  name?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as SchemaJobsBody

    // R4/secfix2: Reject caller-supplied raw DDL — always regenerate from a validated canvas.
    // Without this guard, POST /api/schema-jobs { forwardDDL: "DROP SCHEMA public CASCADE;" }
    // would persist a pending job whose DDL is then executed verbatim by apply/route.ts,
    // bypassing all R1/R2/R4 hardening in the schema-builder. Mirror of schema/api/route.ts R4.
    if (!body.canvas) {
      return NextResponse.json(
        {
          success: false,
          error:
            'DDL must be generated from a validated schema canvas. ' +
            'Supply a `canvas` field (CanvasState) — raw `forwardDDL`/`reverseDDL` are not accepted.',
        },
        { status: 400 },
      )
    }

    // Derive DDL exclusively from the validated canvas — body.forwardDDL/reverseDDL are ignored.
    const forwardDDL = generateForwardDDL(body.canvas)
    const reverseDDL = generateReverseDDL(body.canvas)

    if (!forwardDDL.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'No DDL to emit — canvas is empty or contains no tables',
        },
        { status: 400 },
      )
    }

    const col = getJobsCollection()
    const id = `sjob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const job = {
      id,
      name: body.name ?? `migration_${Date.now()}`,
      status: 'pending',
      forwardDDL,
      reverseDDL,
      hasuraTracked: false,
      createdAt: new Date().toISOString(),
      appliedAt: undefined as string | undefined,
      error: undefined as string | undefined,
    }

    col.insert(job)

    return NextResponse.json({ id, success: true }, { status: 201 })
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
