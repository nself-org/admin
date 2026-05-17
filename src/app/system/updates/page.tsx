'use client'

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle,
  Download,
  ExternalLink,
  RefreshCw,
  Tag,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  upToDate: boolean
  releaseNotes?: string
  releaseUrl?: string
  publishedAt?: string
}

const getCsrf = () =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('nself-csrf='))
    ?.split('=')[1] ?? ''

function UpdatesContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateResult, setUpdateResult] = useState<string | null>(null)

  const checkUpdates = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    setUpdateResult(null)
    try {
      const response = await fetch('/api/nself/updates')
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
      setUpdateInfo(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    checkUpdates()
  }, [checkUpdates])

  const runUpdate = async () => {
    setUpdating(true)
    setUpdateResult(null)
    setError(null)
    try {
      const response = await fetch('/api/nself/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrf(),
        },
        body: JSON.stringify({ action: 'update' }),
      })
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body?.error ?? 'Update failed')
        return
      }
      const result = await response.json()
      setUpdateResult(result.output ?? 'Update complete')
      // Refresh version info after update
      await checkUpdates()
    } catch {
      setError('Update request failed — check your connection')
    } finally {
      setUpdating(false)
    }
  }

  // State 1: Initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Make sure the nself stack is running before checking for updates.
            </p>
          </div>
        </div>
        <Button onClick={checkUpdates} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !updateInfo) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to check updates</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={checkUpdates} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!updateInfo) {
    return (
      <div className="p-6 text-center text-gray-400">
        <ArrowUpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No update information available.</p>
        <Button onClick={checkUpdates} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Check Now
        </Button>
      </div>
    )
  }

  // States 6 + 7: Up-to-date or update available
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">nself Updates</h2>
          <p className="text-sm text-gray-400 mt-1">Keep your nself CLI up to date</p>
        </div>
        <Button
          onClick={checkUpdates}
          disabled={loading || updating}
          variant="secondary"
          size="sm"
        >
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Refresh'}
        </Button>
      </div>

      {/* Version cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Tag className="h-4 w-4" />
            Current version
          </div>
          <p className="text-2xl font-mono font-bold text-white">
            {updateInfo.currentVersion}
          </p>
        </div>
        <div className={`rounded-lg border p-4 ${updateInfo.upToDate ? 'border-green-500/30 bg-green-500/5' : 'border-sky-500/30 bg-sky-500/5'}`}>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <ArrowUpCircle className="h-4 w-4" />
            Latest version
          </div>
          <p className={`text-2xl font-mono font-bold ${updateInfo.upToDate ? 'text-green-400' : 'text-sky-400'}`}>
            {updateInfo.latestVersion}
          </p>
          {updateInfo.publishedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Released {new Date(updateInfo.publishedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Status banner */}
      {updateInfo.upToDate ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 font-medium">You are running the latest version</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-sky-500/10 border border-sky-500/30">
          <Download className="h-5 w-5 text-sky-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sky-400 font-medium">Update available</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {updateInfo.latestVersion} is available — you are on {updateInfo.currentVersion}
            </p>
          </div>
          <Button
            onClick={runUpdate}
            disabled={updating || loading}
            size="sm"
          >
            {updating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Update now
              </>
            )}
          </Button>
        </div>
      )}

      {/* Update result */}
      {updateResult && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-400 font-medium text-sm">Update complete</span>
          </div>
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-40">
            {updateResult}
          </pre>
        </div>
      )}

      {/* Error during update */}
      {error && updateInfo && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Release notes */}
      {updateInfo.releaseNotes && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Release notes</h3>
            {updateInfo.releaseUrl && (
              <a
                href={updateInfo.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap overflow-auto max-h-64">
            {updateInfo.releaseNotes}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function UpdatesPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <UpdatesContent />
    </Suspense>
  )
}
