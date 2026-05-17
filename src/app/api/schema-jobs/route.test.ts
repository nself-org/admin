/**
 * Security regression tests for POST /api/schema-jobs — R4/secfix2
 *
 * T-A: Raw caller-supplied forwardDDL/reverseDDL in POST body are rejected
 *      with HTTP 400. A valid canvas results in a job persisted with DDL
 *      derived from generateForwardDDL(canvas), NOT from caller input.
 *
 * SP-13.B20
 */

import { NextRequest } from 'next/server'

// ── Mock infrastructure ───────────────────────────────────────────────────────

// Auth always passes in unit tests
jest.mock('@/lib/require-auth', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}))

// Capture inserted LokiJS records; avoid real fs writes
const insertedJobs: Record<string, unknown>[] = []
jest.mock('@/lib/database', () => ({
  getDb: jest.fn().mockReturnValue({
    getCollection: jest.fn().mockReturnValue({
      chain: jest.fn().mockReturnValue({
        simplesort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        data: jest.fn().mockReturnValue([]),
      }),
      insert: jest.fn((job: Record<string, unknown>) => {
        insertedJobs.push({ ...job })
      }),
    }),
    addCollection: jest.fn().mockReturnValue({
      chain: jest.fn().mockReturnValue({
        simplesort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        data: jest.fn().mockReturnValue([]),
      }),
      insert: jest.fn((job: Record<string, unknown>) => {
        insertedJobs.push({ ...job })
      }),
    }),
  }),
}))

// ── Import after mocks ────────────────────────────────────────────────────────
import { POST } from './route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3021/api/schema-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── T-A: raw DDL → 400, no job persisted ─────────────────────────────────────

describe('POST /api/schema-jobs — R4/secfix2 raw DDL rejection (T-A)', () => {
  beforeEach(() => {
    insertedJobs.length = 0
  })

  it('T-A-1: rejects body with forwardDDL and no canvas → HTTP 400', async () => {
    const req = makePost({ forwardDDL: 'DROP TABLE np_users;--' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json() as { success: boolean; error: string }
    expect(json.success).toBe(false)
    expect(json.error).toMatch(/validated schema canvas/)

    // No job must have been inserted
    expect(insertedJobs).toHaveLength(0)
  })

  it('T-A-2: rejects body with only reverseDDL and no canvas → HTTP 400', async () => {
    const req = makePost({ reverseDDL: 'CREATE TABLE evil()' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(insertedJobs).toHaveLength(0)
  })

  it('T-A-3: rejects empty body (no canvas) → HTTP 400', async () => {
    const req = makePost({})
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(insertedJobs).toHaveLength(0)
  })

  it('T-A-4: valid canvas → HTTP 201 + job persisted with builder-derived DDL (not caller input)', async () => {
    // Minimal valid canvas with one table
    const canvas = {
      tables: [
        {
          id: 't1',
          name: 'test_table',
          schema: 'public',
          x: 0,
          y: 0,
          columns: [
            {
              id: 'c1',
              name: 'id',
              type: 'uuid',
              nullable: false,
              isPrimaryKey: true,
            },
          ],
        },
      ],
      relationships: [],
    }

    // Include a raw forwardDDL alongside canvas — it must be IGNORED
    const req = makePost({
      canvas,
      forwardDDL: 'DROP SCHEMA public CASCADE;',  // attacker payload — must be ignored
      name: 'test_migration',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const json = await res.json() as { success: boolean; id: string }
    expect(json.success).toBe(true)
    expect(json.id).toMatch(/^sjob_/)

    // Exactly one job must have been inserted
    expect(insertedJobs).toHaveLength(1)
    const persisted = insertedJobs[0] as { forwardDDL: string; reverseDDL: string }

    // The persisted DDL must come from generateForwardDDL(canvas) — contains table
    expect(persisted.forwardDDL).toContain('test_table')

    // The attacker payload must NOT appear in the persisted DDL
    expect(persisted.forwardDDL).not.toContain('DROP SCHEMA public CASCADE')

    // reverseDDL is builder-derived (DROP TABLE or empty string — either is valid)
    expect(typeof persisted.reverseDDL).toBe('string')
  })
})
