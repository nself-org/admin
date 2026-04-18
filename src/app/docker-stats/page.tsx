'use client'

import {
  Box,
  CheckCircle2,
  CircleHelp,
  Cpu,
  HardDrive,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ContainerInfo {
  id: string
  name: string
  image: string
  state: string
  status: string
  health: 'healthy' | 'unhealthy' | 'starting' | 'none'
  healthCheck: {
    test: string[]
    interval: number | null
    timeout: number | null
    retries: number | null
    startPeriod: number | null
  } | null
  resources: {
    cpuShares: number | null
    cpuQuota: number | null
    cpuPeriod: number | null
    memoryLimitBytes: number | null
    memoryReservationBytes: number | null
    pidsLimit: number | null
  }
}

interface DockerStatsResponse {
  generatedAt: string
  containers: ContainerInfo[]
  error?: string
}

function HealthIcon({ health }: { health: ContainerInfo['health'] }) {
  if (health === 'healthy')
    return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (health === 'unhealthy')
    return <XCircle className="h-4 w-4 text-red-400" />
  if (health === 'starting')
    return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
  return <CircleHelp className="text-nself-text-muted h-4 w-4" />
}

function fmtBytes(b: number | null): string {
  if (b === null || b === 0) return '—'
  const mb = b / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(0)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function fmtNs(ns: number | null): string {
  if (ns === null) return '—'
  return `${Math.round(ns / 1_000_000_000)}s`
}

export default function DockerStatsPage() {
  const [data, setData] = useState<DockerStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/docker-stats', { cache: 'no-store' })
      const json = (await res.json()) as DockerStatsResponse
      if (json.error !== undefined) setError(json.error)
      setData(json)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load docker stats.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            Docker Health &amp; Limits
          </h1>
          <p className="text-nself-text-muted text-xs">
            Every container&apos;s healthcheck config and resource constraints
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <CircleHelp className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300">{error}</p>
        </div>
      )}

      {data === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-nself-primary h-5 w-5 animate-spin" />
        </div>
      ) : data.containers.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Box className="text-nself-text-muted mx-auto mb-2 h-6 w-6" />
          <p className="text-nself-text-muted text-sm">
            No containers running.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-nself-text-muted text-xs">
                <th className="pr-4 pb-2 font-medium">Container</th>
                <th className="pr-4 pb-2 font-medium">Health</th>
                <th className="pr-4 pb-2 font-medium">Healthcheck</th>
                <th className="pr-4 pb-2 font-medium">
                  <Cpu className="inline h-3 w-3" /> CPU
                </th>
                <th className="pr-4 pb-2 font-medium">
                  <HardDrive className="inline h-3 w-3" /> Memory
                </th>
                <th className="pb-2 font-medium">Pids</th>
              </tr>
            </thead>
            <tbody>
              {data.containers.map((c) => {
                const cpuQuota =
                  c.resources.cpuQuota !== null &&
                  c.resources.cpuPeriod !== null
                    ? `${(c.resources.cpuQuota / c.resources.cpuPeriod).toFixed(2)} cores`
                    : c.resources.cpuShares !== null
                      ? `${c.resources.cpuShares} shares`
                      : '—'
                return (
                  <tr key={c.id} className="border-nself-border border-t">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Box className="text-nself-primary h-3 w-3" />
                        <div>
                          <p className="text-nself-text font-medium">
                            {c.name}
                          </p>
                          <p className="text-nself-text-muted font-mono text-xs">
                            {c.image}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <HealthIcon health={c.health} />
                        <span
                          className={`text-xs capitalize ${
                            c.health === 'healthy'
                              ? 'text-green-400'
                              : c.health === 'unhealthy'
                                ? 'text-red-400'
                                : c.health === 'starting'
                                  ? 'text-amber-400'
                                  : 'text-nself-text-muted'
                          }`}
                        >
                          {c.health}
                        </span>
                      </div>
                      <p className="text-nself-text-muted mt-0.5 text-xs">
                        {c.status}
                      </p>
                    </td>
                    <td className="text-nself-text-muted py-2 pr-4 text-xs">
                      {c.healthCheck === null ? (
                        <span>none</span>
                      ) : (
                        <div className="space-y-0.5">
                          <p>interval: {fmtNs(c.healthCheck.interval)}</p>
                          <p>timeout: {fmtNs(c.healthCheck.timeout)}</p>
                          <p>retries: {c.healthCheck.retries ?? '—'}</p>
                        </div>
                      )}
                    </td>
                    <td className="text-nself-text-muted py-2 pr-4 font-mono text-xs">
                      {cpuQuota}
                    </td>
                    <td className="text-nself-text-muted py-2 pr-4 font-mono text-xs">
                      {fmtBytes(c.resources.memoryLimitBytes)}
                      {c.resources.memoryReservationBytes !== null && (
                        <p className="text-[10px]">
                          rsv {fmtBytes(c.resources.memoryReservationBytes)}
                        </p>
                      )}
                    </td>
                    <td className="text-nself-text-muted py-2 font-mono text-xs">
                      {c.resources.pidsLimit ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
