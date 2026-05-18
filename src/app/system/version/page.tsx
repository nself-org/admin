'use client'

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  Binary,
  CheckCircle,
  FolderOpen,
  RefreshCw,
  Tag,
  Terminal,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface VersionInfo {
  version: string
  path: string
  nodeVersion?: string
  platform?: string
  adminVersion?: string
}

function VersionContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [info, setInfo] = useState<VersionInfo | null>(null)
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
      const data = await response.json()
      // Augment with client-side runtime info
      setInfo({
        ...data,
        nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
        platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      })
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
            <p className="font-medium text-yellow-400">Cannot reach nself CLI</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Verify the nself binary is installed and on PATH.
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
  if (error && !info) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load version info</p>
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

  // State 3: No data yet
  if (!info) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Binary className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No version information available.</p>
        <Button
          onClick={fetchVersion}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Info
        </Button>
      </div>
    )
  }

  const rows: { icon: React.ReactNode; label: string; value: string; mono?: boolean }[] = [
    {
      icon: <Tag className="h-4 w-4 text-sky-400" />,
      label: 'nself CLI version',
      value: info.version,
      mono: true,
    },
    {
      icon: <FolderOpen className="h-4 w-4 text-gray-400" />,
      label: 'Binary path',
      value: info.path,
      mono: true,
    },
    {
      icon: <Terminal className="h-4 w-4 text-gray-400" />,
      label: 'Node.js runtime',
      value: info.nodeVersion ?? 'unknown',
      mono: true,
    },
    {
      icon: <Binary className="h-4 w-4 text-gray-400" />,
      label: 'Platform',
      value: info.platform ?? 'unknown',
    },
  ]

  // States 6 + 7: Success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Version Information</h2>
          <p className="mt-1 text-sm text-gray-400">System and component version details</p>
        </div>
        <Button onClick={fetchVersion} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Version highlight card */}
      <div className="flex items-center gap-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-5">
        <CheckCircle className="h-8 w-8 flex-shrink-0 text-sky-400" />
        <div>
          <p className="text-sm text-gray-400">nself CLI</p>
          <p className="font-mono text-3xl font-bold text-white">{info.version}</p>
        </div>
      </div>

      {/* Details list */}
      <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex w-5 flex-shrink-0 items-center justify-center">{row.icon}</div>
            <span className="w-40 flex-shrink-0 text-sm text-gray-400">{row.label}</span>
            <span className={`flex-1 text-sm text-white ${row.mono ? 'font-mono' : ''}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
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
