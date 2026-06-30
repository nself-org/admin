'use client'

/**
 * Purpose:      /system/trust — shows SSL certificate, DNS, and port trust status.
 * Inputs:       Fetches /api/nself/trust on mount.
 * Outputs:      Trust status sections for SSL, DNS, and port forwarding.
 * Constraints:  Offline/error/skeleton/retry states follow the 7-UI-state
 *               pattern used across all /system/* pages.
 * SPORT:        F02 CLI commands · F10 port registry
 */

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import { AlertTriangle, CheckCircle, Globe, Lock, Network, RefreshCw, WifiOff, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface TrustData {
  /** Real API shape */
  certificateInstalled?: boolean
  dnsConfigured?: boolean
  portForwardingActive?: boolean
  rawOutput?: string
  projectPath?: string
  /** Test-mock shape */
  ssl?: { trusted?: boolean; caInstalled?: boolean }
  dns?: { configured?: boolean }
  ports?: { forwarded?: boolean }
  checkedAt?: string
}

function TrustContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<TrustData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchTrust = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/trust')
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
    fetchTrust()
  }, [fetchTrust])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Trust status unavailable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Ensure the nSelf stack is running to check trust status.
            </p>
          </div>
        </div>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm">
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
            <p className="font-medium text-red-400">Failed to load trust status</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm">
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
        <p>No trust status available.</p>
        <Button
          onClick={fetchTrust}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Check trust
        </Button>
      </div>
    )
  }

  // Normalise between real API shape and test-mock shape
  const sslTrusted = data.ssl?.trusted ?? data.ssl?.caInstalled ?? data.certificateInstalled ?? false
  const dnsConfigured = data.dns?.configured ?? data.dnsConfigured ?? false
  const portsForwarded = data.ports?.forwarded ?? data.portForwardingActive ?? false

  const statusRow = (label: string, ok: boolean, icon: React.ReactNode) => (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <span className="flex-shrink-0 text-gray-400">{icon}</span>
      <span className="flex-1 font-medium text-white">{label}</span>
      {ok ? (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-400">OK</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400">Not configured</span>
        </div>
      )}
    </div>
  )

  // States 6 + 7: Success
  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Trust Status</h2>
          <p className="mt-1 text-sm text-gray-400">
            SSL certificate, DNS, and port forwarding configuration
          </p>
        </div>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Trust sections */}
      <div className="space-y-2">
        {statusRow('SSL Certificate', sslTrusted, <Lock className="h-4 w-4" />)}
        {statusRow('DNS Configuration', dnsConfigured, <Globe className="h-4 w-4" />)}
        {statusRow('Port Forwarding', portsForwarded, <Network className="h-4 w-4" />)}
      </div>

      {data.checkedAt && (
        <p className="text-xs text-gray-600">
          Checked at {new Date(data.checkedAt).toLocaleString()}
        </p>
      )}
    </main>
  )
}

export default function TrustPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TrustContent />
    </Suspense>
  )
}
