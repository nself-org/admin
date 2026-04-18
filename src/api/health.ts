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

export type { ConnectedProject, PluginStatus }

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
    network: boolean
    nself: boolean
  }
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
export async function fetchAdminHealth(
  baseUrl = 'http://localhost:3021',
): Promise<HealthStatus> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok && response.status !== 503) {
    throw new Error(
      `Admin health request failed: ${response.status} ${response.statusText}`,
    )
  }

  const data: unknown = await response.json()
  return data as HealthStatus
}
