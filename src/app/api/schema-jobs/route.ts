/**
 * Schema Jobs API — list and create migration jobs
 * SP-13.B20
 *
 * Jobs are stored in LokiJS (nadmin.db) under the 'schema_jobs' collection.
 * Each job has: id, name, status, forwardDDL, reverseDDL, hasuraTracked,
 *               createdAt, appliedAt, error
 */

import { getDb } from '@/lib/database'
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      name?: string
      forwardDDL?: string
      reverseDDL?: string
    }

    if (!body.forwardDDL?.trim()) {
      return NextResponse.json(
        { success: false, error: 'forwardDDL is required' },
        { status: 400 },
      )
    }

    const col = getJobsCollection()
    const id = `sjob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const job = {
      id,
      name: body.name ?? `migration_${Date.now()}`,
      status: 'pending',
      forwardDDL: body.forwardDDL,
      reverseDDL: body.reverseDDL ?? '',
      hasuraTracked: false,
      createdAt: new Date().toISOString(),
      appliedAt: undefined,
      error: undefined,
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
