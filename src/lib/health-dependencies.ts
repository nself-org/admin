/**
 * Purpose: Health probes for the services the admin actually depends on —
 *          PostgreSQL and Hasura — plus an opt-in, purely informational report
 *          of outbound internet reachability.
 * Inputs:  Environment only. DATABASE_URL (or HASURA_GRAPHQL_DATABASE_URL /
 *          HASURA_METADATA_DATABASE_URL, or POSTGRES_HOST+POSTGRES_PORT) for
 *          Postgres; HASURA_GRAPHQL_ENDPOINT for Hasura;
 *          NSELF_ADMIN_HEALTH_OUTBOUND_URL to opt into the outbound probe.
 * Outputs: DependencyCheck results consumed by GET /api/health.
 * Constraints:
 *   - Offline-safe. nSelf is a self-hosted product that explicitly supports
 *     offline / air-gapped operation (the Bundle License carries a documented
 *     7-day offline window), so admin health must never be contingent on
 *     reaching the public internet. The previous implementation pinged
 *     google.com, which left every isolated install permanently "degraded"
 *     with no actual fault.
 *   - No ICMP, ever. `ping` is absent or blocked in most container and CI
 *     images, so it reports "down" where connectivity is fine — observed in
 *     E2E golden-path run 35532071307 on a GitHub-hosted runner with working
 *     networking ("network": false alongside working docker/nself checks).
 *   - An unconfigured dependency is not a fault. When the admin is run
 *     standalone (CI, a bare `docker run` of nself/nself-admin, the wizard
 *     before a stack exists) these vars are simply absent; reporting that as
 *     a failure would recreate the same false-degraded bug in a new place.
 *     Such a check reports ok:true with configured:false, and the reason is
 *     surfaced in `detail` for the operator.
 *   - Outbound connectivity is never part of overall status, and is probed
 *     only when the operator names a URL. There is no phone-home default.
 * SPORT: admin / api-health
 */

import net from 'net'

/** Result of one dependency probe. */
export interface DependencyCheck {
  /** False only for a configured dependency that could not be reached. */
  ok: boolean
  /** Whether this dependency is configured in the environment at all. */
  configured: boolean
  /** Human-readable reason — connection detail, or why the probe was skipped. */
  detail: string
  /** Probe duration in ms; omitted when nothing was probed. */
  latencyMs?: number
}

/**
 * Outbound internet reachability. Informational only — never folded into the
 * admin's overall health status.
 */
export type OutboundStatus = 'ok' | 'unreachable' | 'not-checked'

const TCP_TIMEOUT_MS = 2000
const HTTP_TIMEOUT_MS = 2000
const OUTBOUND_TIMEOUT_MS = 3000
const DEFAULT_POSTGRES_PORT = 5432

type Env = Record<string, string | undefined>

function notConfigured(detail: string): DependencyCheck {
  return { ok: true, configured: false, detail }
}

/**
 * Open a TCP connection and close it immediately. Reachability only: no
 * credentials, no protocol handshake, no writes against the target.
 */
function tcpProbe(host: string, port: number, timeoutMs: number): Promise<DependencyCheck> {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const socket = new net.Socket()
    let settled = false

    const settle = (ok: boolean, detail: string) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({ ok, configured: true, detail, latencyMs: Date.now() - startedAt })
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => settle(true, `connected to ${host}:${port}`))
    socket.once('timeout', () => settle(false, `${host}:${port} timed out after ${timeoutMs}ms`))
    socket.once('error', (err: Error) => settle(false, `${host}:${port} — ${err.message}`))

    try {
      socket.connect(port, host)
    } catch (err) {
      settle(false, `${host}:${port} — ${err instanceof Error ? err.message : 'connect failed'}`)
    }
  })
}

/**
 * Resolve the Postgres host/port from the environment.
 *
 * A connection URL wins over the discrete POSTGRES_* vars because that is what
 * `nself build` writes into a service's environment (see
 * cli/internal/compose/custom_services.go). Credentials in the URL are never
 * read — only host and port.
 */
export function resolvePostgresTarget(env: Env): { host: string; port: number } | null {
  const url =
    env.DATABASE_URL || env.HASURA_GRAPHQL_DATABASE_URL || env.HASURA_METADATA_DATABASE_URL

  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.hostname) {
        return {
          host: parsed.hostname,
          port: Number(parsed.port) || DEFAULT_POSTGRES_PORT,
        }
      }
    } catch {
      // Malformed URL — fall through to the discrete vars rather than failing.
    }
  }

  if (env.POSTGRES_HOST) {
    return {
      host: env.POSTGRES_HOST,
      port: Number(env.POSTGRES_PORT) || DEFAULT_POSTGRES_PORT,
    }
  }

  return null
}

/**
 * Resolve Hasura's /healthz URL from HASURA_GRAPHQL_ENDPOINT (which points at
 * /v1/graphql). /healthz needs no admin secret and reports Hasura's own health,
 * including inconsistent metadata — a real fault the operator should see.
 */
export function resolveHasuraHealthUrl(env: Env): string | null {
  const endpoint = env.HASURA_GRAPHQL_ENDPOINT
  if (!endpoint) return null

  try {
    const parsed = new URL(endpoint)
    parsed.pathname = '/healthz'
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

/** Probe PostgreSQL reachability. Unconfigured => ok, not a fault. */
export async function checkPostgres(env: Env = process.env): Promise<DependencyCheck> {
  const target = resolvePostgresTarget(env)
  if (!target) {
    return notConfigured('not configured (no DATABASE_URL or POSTGRES_HOST)')
  }
  return tcpProbe(target.host, target.port, TCP_TIMEOUT_MS)
}

/** Probe Hasura's /healthz endpoint. Unconfigured => ok, not a fault. */
export async function checkHasura(env: Env = process.env): Promise<DependencyCheck> {
  const url = resolveHasuraHealthUrl(env)
  if (!url) {
    return notConfigured('not configured (no HASURA_GRAPHQL_ENDPOINT)')
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    })
    return {
      ok: response.ok,
      configured: true,
      detail: `${url} returned ${response.status}`,
      latencyMs: Date.now() - startedAt,
    }
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: `${url} — ${err instanceof Error ? err.message : 'request failed'}`,
      latencyMs: Date.now() - startedAt,
    }
  }
}

/**
 * Optional outbound-connectivity report.
 *
 * Off unless the operator sets NSELF_ADMIN_HEALTH_OUTBOUND_URL: a self-hosted
 * product must not reach out to a vendor-chosen host on every health poll, and
 * an air-gapped install must not pay a doomed timeout on each one. The result
 * is informational and never affects overall status.
 */
export async function checkOutbound(env: Env = process.env): Promise<OutboundStatus> {
  const url = env.NSELF_ADMIN_HEALTH_OUTBOUND_URL
  if (!url) return 'not-checked'

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    })
    return response.ok ? 'ok' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}
