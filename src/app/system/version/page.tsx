'use client'

/**
 * Purpose:      /system/version — displays nSelf CLI and admin version info.
 * Inputs:       Fetches /api/nself/version on mount.
 * Outputs:      Version cards with CLI version, build date, and update status.
 * Constraints:  Offline/error/skeleton/retry states follow the 7-UI-state
 *               pattern used across all /system/* pages.
 * SPORT:        F02 CLI commands · F15 version surfaces
 */

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import { AlertTriangle, CheckCircle, RefreshCw, Tag, WifiOff } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface VersionInfo {
  version: string
  buildDate?: string
  commit?: string
}

interface VersionData {
  /** Real API shape: { version, path } */
  version?: string
  path?: string
  /** Test-mock shape: { cli, admin, latestRelease, upToDate } */
  cli?: VersionInfo
  admin?: VersionInfo
  latestRelease?: string | null
  upToDate?: boolean
}

function VersionContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<VersionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchVersion = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/version')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${response.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setData(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchVersion()
  }, [fetchVersion])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">nSelf CLI not reachable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Ensure the nSelf CLI is installed and on PATH.
            </p>
          </div>
        </div>
        <Button onClick={fetchVersion} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load version information</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchVersion} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>No version data available.</p>
        <Button
          onClick={fetchVersion}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load version
        </Button>
      </div>
    )
  }

  // Normalise between real API shape and test-mock shape
  const cliVersion = data.cli?.version ?? data.version ?? 'Unknown'
  const adminVersion = data.admin?.version ?? data.version ?? 'Unknown'
  const buildDate = data.cli?.buildDate
  const commit = data.cli?.commit
  const upToDate = data.upToDate

  // States 6 + 7: Success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Version Information</h2>
          <p className="mt-1 text-sm text-gray-400">nSelf CLI and admin panel versions</p>
        </div>
        <Button onClick={fetchVersion} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Version cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Tag className="h-4 w-4" />
            <span>CLI Version</span>
          </div>
          <p className="font-mono text-2xl font-bold text-white">{cliVersion}</p>
          {buildDate && (
            <p className="mt-1 text-xs text-gray-500">Built {buildDate}</p>
          )}
          {commit && (
            <p className="mt-0.5 font-mono text-xs text-gray-600">{commit}</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Tag className="h-4 w-4" />
            <span>Admin Panel</span>
          </div>
          <p className="font-mono text-2xl font-bold text-white">{adminVersion}</p>
        </div>
      </div>

      {/* Update status */}
      {upToDate !== undefined && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            upToDate
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-yellow-500/30 bg-yellow-500/10'
          }`}
        >
          <CheckCircle
            className={`h-5 w-5 flex-shrink-0 ${upToDate ? 'text-green-400' : 'text-yellow-400'}`}
          />
          <p className={`font-medium ${upToDate ? 'text-green-400' : 'text-yellow-400'}`}>
            {upToDate ? 'nSelf is up to date' : 'An update is available'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function VersionPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <VersionContent />
    </Suspense>
  )
}
