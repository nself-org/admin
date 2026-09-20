/**
 * Tests for the admin's in-stack dependency probes.
 *
 * The behaviour under test is deliberately offline-first: nSelf supports
 * air-gapped operation, so nothing here may report a fault merely because the
 * public internet is unreachable, and nothing may use ICMP (`ping` is absent or
 * blocked in most container/CI images).
 */

import type { AddressInfo } from 'net'
import net from 'net'
import {
  checkHasura,
  checkOutbound,
  checkPostgres,
  resolveHasuraHealthUrl,
  resolvePostgresTarget,
} from '../health-dependencies'

/** Start a TCP listener on an ephemeral port; resolves with port + closer. */
async function withTcpServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = net.createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

describe('resolvePostgresTarget', () => {
  it('prefers DATABASE_URL and extracts host + port', () => {
    expect(resolvePostgresTarget({ DATABASE_URL: 'postgres://u:p@postgres:5433/nself' })).toEqual({
      host: 'postgres',
      port: 5433,
    })
  })

  it('defaults to 5432 when the URL omits a port', () => {
    expect(resolvePostgresTarget({ DATABASE_URL: 'postgres://u:p@db/nself' })).toEqual({
      host: 'db',
      port: 5432,
    })
  })

  it('falls back to the Hasura database URLs', () => {
    expect(
      resolvePostgresTarget({
        HASURA_METADATA_DATABASE_URL: 'postgres://u:p@meta:6000/nself',
      })
    ).toEqual({ host: 'meta', port: 6000 })
  })

  it('falls back to POSTGRES_HOST/PORT when no URL is present', () => {
    expect(resolvePostgresTarget({ POSTGRES_HOST: 'pg', POSTGRES_PORT: '15432' })).toEqual({
      host: 'pg',
      port: 15432,
    })
  })

  it('falls back to the discrete vars when the URL is malformed', () => {
    expect(resolvePostgresTarget({ DATABASE_URL: 'not a url', POSTGRES_HOST: 'pg' })).toEqual({
      host: 'pg',
      port: 5432,
    })
  })

  it('returns null when nothing is configured', () => {
    expect(resolvePostgresTarget({})).toBeNull()
  })
})

describe('resolveHasuraHealthUrl', () => {
  it('rewrites the GraphQL endpoint to /healthz', () => {
    expect(
      resolveHasuraHealthUrl({ HASURA_GRAPHQL_ENDPOINT: 'http://hasura:8080/v1/graphql' })
    ).toBe('http://hasura:8080/healthz')
  })

  it('drops any query string on the endpoint', () => {
    expect(
      resolveHasuraHealthUrl({ HASURA_GRAPHQL_ENDPOINT: 'http://hasura:8080/v1/graphql?x=1' })
    ).toBe('http://hasura:8080/healthz')
  })

  it('returns null when unset or malformed', () => {
    expect(resolveHasuraHealthUrl({})).toBeNull()
    expect(resolveHasuraHealthUrl({ HASURA_GRAPHQL_ENDPOINT: '::::' })).toBeNull()
  })
})

describe('checkPostgres', () => {
  it('reports ok when the port accepts a connection', async () => {
    const server = await withTcpServer()
    try {
      const result = await checkPostgres({
        DATABASE_URL: `postgres://u:p@127.0.0.1:${server.port}/nself`,
      })
      expect(result.ok).toBe(true)
      expect(result.configured).toBe(true)
    } finally {
      await server.close()
    }
  })

  it('reports a fault when a configured Postgres refuses the connection', async () => {
    // Bind then immediately release the port so nothing is listening on it.
    const server = await withTcpServer()
    const deadPort = server.port
    await server.close()

    const result = await checkPostgres({
      DATABASE_URL: `postgres://u:p@127.0.0.1:${deadPort}/nself`,
    })
    expect(result.ok).toBe(false)
    expect(result.configured).toBe(true)
  })

  it('is not a fault when Postgres is not configured at all', async () => {
    const result = await checkPostgres({})
    expect(result.ok).toBe(true)
    expect(result.configured).toBe(false)
    expect(result.detail).toMatch(/not configured/)
  })
})

describe('checkHasura', () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
  })

  it('reports ok on a 200 from /healthz', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch

    const result = await checkHasura({ HASURA_GRAPHQL_ENDPOINT: 'http://hasura:8080/v1/graphql' })

    expect(result.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith('http://hasura:8080/healthz', expect.anything())
  })

  it('reports a fault on a non-2xx (e.g. inconsistent metadata)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch

    const result = await checkHasura({ HASURA_GRAPHQL_ENDPOINT: 'http://hasura:8080/v1/graphql' })

    expect(result.ok).toBe(false)
    expect(result.configured).toBe(true)
  })

  it('reports a fault when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch

    const result = await checkHasura({ HASURA_GRAPHQL_ENDPOINT: 'http://hasura:8080/v1/graphql' })

    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/ECONNREFUSED/)
  })

  it('is not a fault when Hasura is not configured at all', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch

    const result = await checkHasura({})

    expect(result.ok).toBe(true)
    expect(result.configured).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('checkOutbound', () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
  })

  it('does not probe at all unless the operator names a URL', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch

    await expect(checkOutbound({})).resolves.toBe('not-checked')
    // No phone-home default: an air-gapped install pays no doomed timeout.
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reports ok when the named URL responds', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch

    await expect(
      checkOutbound({ NSELF_ADMIN_HEALTH_OUTBOUND_URL: 'https://example.test/healthz' })
    ).resolves.toBe('ok')
  })

  it('reports unreachable when the request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('EAI_AGAIN')) as unknown as typeof fetch

    await expect(
      checkOutbound({ NSELF_ADMIN_HEALTH_OUTBOUND_URL: 'https://example.test/healthz' })
    ).resolves.toBe('unreachable')
  })
})
