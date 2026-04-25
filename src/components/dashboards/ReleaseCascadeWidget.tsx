'use client'

/**
 * ReleaseCascadeWidget
 * Shows live release cascade status from `nself release-status` via the admin API.
 * Displays per-artifact: cli / admin / homebrew / ping_api / web/org / vercel
 * with fresh/stale/unknown badges and the latest GitHub release version.
 */

import { cn } from '@/lib/utils'
import useSWR from 'swr'

interface ArtifactStatus {
  artifact: string
  running: string
  latest: string
  status: 'fresh' | 'stale' | 'unknown'
}

interface ReleaseStatusData {
  latest: string
  artifacts: ArtifactStatus[]
  checked: string
}

const fetcher = async (url: string): Promise<ReleaseStatusData> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch release status')
  return res.json()
}

const STATUS_STYLES: Record<string, string> = {
  fresh: 'bg-green-500/10 text-green-400 border-green-500/30',
  stale: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const STATUS_DOTS: Record<string, string> = {
  fresh: 'bg-green-400',
  stale: 'bg-yellow-400',
  unknown: 'bg-gray-500',
}

const ARTIFACT_LABELS: Record<string, string> = {
  cli: 'CLI Binary',
  admin: 'Admin Docker',
  homebrew: 'Homebrew',
  ping_api: 'ping_api',
  'web/org': 'nself.org',
  vercel: 'Vercel',
}

interface ReleaseCascadeWidgetProps {
  className?: string
  /** Auto-refresh interval in seconds. Defaults to 300 (5 min). */
  refreshInterval?: number
}

export function ReleaseCascadeWidget({
  className,
  refreshInterval = 300,
}: ReleaseCascadeWidgetProps) {
  const { data, error, isLoading } = useSWR<ReleaseStatusData>(
    '/api/release-status',
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  )

  const overall = data?.artifacts.every((a) => a.status === 'fresh')
    ? 'fresh'
    : data?.artifacts.some((a) => a.status === 'stale')
      ? 'stale'
      : 'unknown'

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-800 bg-gray-900/50 p-5',
        className,
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Release Cascade</h3>
          {data && (
            <p className="mt-0.5 text-xs text-gray-500">
              Latest:{' '}
              <span className="font-mono text-gray-300">v{data.latest}</span>
            </p>
          )}
        </div>
        {data && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
              STATUS_STYLES[overall],
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOTS[overall])}
            />
            {overall === 'fresh'
              ? 'All synced'
              : overall === 'stale'
                ? 'Drift detected'
                : 'Unknown'}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-lg bg-gray-800/60"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          Failed to load release status. Run{' '}
          <code className="font-mono text-xs">nself release-status</code> in
          your terminal.
        </div>
      )}

      {/* Artifact rows */}
      {data && (
        <div className="space-y-1.5">
          {data.artifacts.map((artifact) => (
            <div
              key={artifact.artifact}
              className="flex items-center justify-between rounded-lg bg-gray-800/30 px-3 py-2 transition-colors hover:bg-gray-800/50"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'h-2 w-2 flex-shrink-0 rounded-full',
                    STATUS_DOTS[artifact.status],
                  )}
                />
                <span className="truncate text-sm text-gray-200">
                  {ARTIFACT_LABELS[artifact.artifact] ?? artifact.artifact}
                </span>
              </div>
              <div className="ml-2 flex flex-shrink-0 items-center gap-3">
                <span className="font-mono text-xs text-gray-400">
                  {artifact.running === 'unknown' ||
                  artifact.running === 'unreachable'
                    ? '—'
                    : `v${artifact.running}`}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                    STATUS_STYLES[artifact.status],
                  )}
                >
                  {artifact.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {data && (
        <p className="mt-3 text-right text-xs text-gray-600">
          Checked {new Date(data.checked).toLocaleTimeString()}
          {' · '}
          <a
            href="https://status.nself.org"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gray-400"
          >
            status.nself.org ↗
          </a>
        </p>
      )}
    </div>
  )
}
