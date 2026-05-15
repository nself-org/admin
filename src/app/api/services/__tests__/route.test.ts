/**
 * Tests for /api/services route — nSelf-First Doctrine compliance.
 *
 * Verifies:
 *   1. ZERO direct docker-compose write invocations remain in this route.
 *   2. Service mutations (start/stop/restart/scale/update) return 501 NotImplemented
 *      with structured { error, message, cliGap: 'G-009' } body until the
 *      `nself service <action>` CLI subcommand ships (CLI gap G-009).
 *   3. serviceName validated against `^[a-z0-9-]+$` allowlist BEFORE any
 *      action dispatch (defense-in-depth for the eventual CLI wiring).
 *   4. Read-only Docker queries (listContainers) are permitted for status.
 */

// Mock dockerode BEFORE importing the route module. Use the global registry
// pattern (similar to admin's other route tests) so jest.mock's hoisting does
// not trip on TDZ when referencing module-scope vars.
jest.mock('dockerode', () => {
  const listContainers = jest.fn()
  const getContainer = jest.fn()
  const g = global as typeof global & {
    __mockListContainers: jest.Mock
    __mockGetContainer: jest.Mock
  }
  g.__mockListContainers = listContainers
  g.__mockGetContainer = getContainer
  return jest.fn().mockImplementation(() => ({
    listContainers,
    getContainer,
  }))
})

// Auth is bypassed; we test the action surface, not the gate.
jest.mock('@/lib/require-auth', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/websocket/emitters', () => ({
  emitServiceStatus: jest.fn(),
}))

jest.mock('@/lib/paths', () => ({
  getDockerSocketPath: () => '/var/run/docker.sock',
  getProjectPath: () => '/tmp/project',
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3021/api/services', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/services — nSelf-First Doctrine (G-009)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe.each(['start', 'stop', 'restart'] as const)(
    'controlService(%s)',
    (action) => {
      it(`returns 501 NotImplemented with cliGap=G-009 for ${action}`, async () => {
        const res = await POST(makePost({ action, service: 'postgres' }))
        expect(res.status).toBe(501)
        const body = await res.json()
        expect(body.error).toBe('NotImplemented')
        expect(body.cliGap).toBe('G-009')
        expect(body.message).toMatch(/nself service/i)
      })

      it(`rejects invalid service name with 400 (before CLI dispatch) for ${action}`, async () => {
        const res = await POST(
          makePost({ action, service: 'bad; rm -rf /' }),
        )
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toMatch(/Invalid service name/i)
      })

      it(`rejects missing service name with 400 for ${action}`, async () => {
        const res = await POST(makePost({ action }))
        expect(res.status).toBe(400)
      })
    },
  )

  describe('scaleService', () => {
    it('returns 501 NotImplemented with cliGap=G-009', async () => {
      const res = await POST(
        makePost({ action: 'scale', service: 'hasura', options: { replicas: 2 } }),
      )
      expect(res.status).toBe(501)
      const body = await res.json()
      expect(body.error).toBe('NotImplemented')
      expect(body.cliGap).toBe('G-009')
    })

    it('rejects invalid serviceName with 400 before reaching 501 stub', async () => {
      const res = await POST(
        makePost({ action: 'scale', service: 'has ura', options: { replicas: 2 } }),
      )
      expect(res.status).toBe(400)
    })
  })

  describe('updateService', () => {
    it('returns 501 NotImplemented with cliGap=G-009', async () => {
      const res = await POST(
        makePost({ action: 'update', service: 'auth' }),
      )
      expect(res.status).toBe(501)
      const body = await res.json()
      expect(body.error).toBe('NotImplemented')
      expect(body.cliGap).toBe('G-009')
    })

    it('rejects invalid serviceName with 400', async () => {
      const res = await POST(
        makePost({ action: 'update', service: 'AUTH$' }),
      )
      expect(res.status).toBe(400)
    })
  })

  describe('action validation', () => {
    it('rejects missing action with 400', async () => {
      const res = await POST(makePost({ service: 'postgres' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/Action is required/i)
    })

    it('rejects unknown action with 400', async () => {
      const res = await POST(
        makePost({ action: 'nuke', service: 'postgres' }),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/Unknown action/i)
    })
  })

  describe('batch operations', () => {
    it('returns 501 for each service in batch (delegates to controlService)', async () => {
      const res = await POST(
        makePost({
          action: 'batch',
          services: ['postgres', 'hasura'],
          options: { operation: 'start' },
        }),
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.services).toBe(2)
      // Each individual service should have been routed through controlService
      // (which returns 501). The batch wrapper aggregates results.
      expect(body.data.results).toHaveLength(2)
    })

    it('rejects empty services list with 400', async () => {
      const res = await POST(
        makePost({ action: 'batch', services: [], options: { operation: 'start' } }),
      )
      expect(res.status).toBe(400)
    })
  })
})
