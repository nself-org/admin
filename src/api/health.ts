/**
 * Typed wrapper for the /api/health endpoint.
 *
 * SERVER-SIDE ONLY — do not import in client components.
 *
 * Exports:
 *   - HealthStatus  — canonical response shape, shared with route.ts
 *   - fetchAdminHealth — typed fetch helper for callers such as `nself doctor`
 */

import type { ConnectedProject, PluginStatus } from '@/lib/health-checks'
import type { DependencyCheck, OutboundStatus } from '@/lib/health-dependencies'

export type { ConnectedProject, DependencyCheck, OutboundStatus, PluginStatus }

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  adminVersion: string
  version: string
  cliVersion?: string
  uptime: number
  uptimeFormatted: string
  env: 'local' | 'staging' | 'prod'
  connectedProject: ConnectedProject | null
  plugins: PluginStatus[]
  checks: {
    docker: boolean
    filesystem: boolean
    memory: boolean
    /** PostgreSQL reachable (or not configured — see `dependencies`). */
    postgres: boolean
    /** Hasura /healthz reachable and green (or not configured). */
    hasura: boolean
    nself: boolean
  }
  /** Per-dependency probe detail: reachability, or why a probe was skipped. */
  dependencies: {
    postgres: DependencyCheck
    hasura: DependencyCheck
  }
  /**
   * Outbound internet reachability — informational ONLY, never part of
   * `status`. nSelf supports offline / air-gapped operation, so an install with
   * no internet is healthy, not degraded. 'not-checked' unless the operator
   * sets NSELF_ADMIN_HEALTH_OUTBOUND_URL.
   */
  outbound: OutboundStatus
  resources: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
  }
}

/**
 * Fetch the health endpoint and return a typed HealthStatus.
 *
 * @param baseUrl - Base URL of the admin instance (default: http://localhost:3021)
 * @throws When the network request fails or the response body cannot be parsed.
 */
export async function fetchAdminHealth(baseUrl = 'http://localhost:3021'): Promise<HealthStatus> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok && response.status !== 503) {
    throw new Error(`Admin health request failed: ${response.status} ${response.statusText}`)
  }

  const data: unknown = await response.json()
  return data as HealthStatus
}
