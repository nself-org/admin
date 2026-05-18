'use client'

import { Button } from '@/components/Button'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
  RefreshCw,
  Route,
  ShieldCheck,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface TrustStatus {
  certificateInstalled: boolean
  dnsConfigured: boolean
  portForwardingActive: boolean
  rawOutput: string
  projectPath: string
}

function TrustContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<TrustStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

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
  if (initialLoad && loading) return <FormSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself CLI</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Verify the nself binary is on PATH and your stack is running.
            </p>
          </div>
        </div>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load trust status</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No trust status available.</p>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Status
        </Button>
      </div>
    )
  }

  const items = [
    {
      icon: <Lock className="h-5 w-5 text-gray-400" />,
      label: 'SSL Certificate',
      description: 'Local CA certificate trusted by the OS',
      active: data.certificateInstalled,
      activeLabel: 'Installed & trusted',
      inactiveLabel: 'Not installed',
      hint: 'Run: nself ssl install',
    },
    {
      icon: <Globe className="h-5 w-5 text-gray-400" />,
      label: 'DNS Configuration',
      description: 'Local DNS resolver for .local domains',
      active: data.dnsConfigured,
      activeLabel: 'Configured',
      inactiveLabel: 'Not configured',
      hint: 'Run: nself dns-setup',
    },
    {
      icon: <Route className="h-5 w-5 text-gray-400" />,
      label: 'Port Forwarding',
      description: 'Firewall rules for HTTP/HTTPS traffic',
      active: data.portForwardingActive,
      activeLabel: 'Active',
      inactiveLabel: 'Inactive',
      hint: 'Run: nself trust install',
    },
  ]

  const allActive = items.every((it) => it.active)

  // States 6 + 7: Success
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Trust & Certificates</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage trusted certificates and local networking
          </p>
        </div>
        <Button onClick={fetchTrust} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Overall banner */}
      {allActive ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 font-medium">All trust components are active</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-medium">Some trust components are inactive</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Run <code className="font-mono text-sky-400">nself trust install</code> to configure all components.
            </p>
          </div>
        </div>
      )}

      {/* Trust items */}
      <div className="rounded-lg border border-white/10 overflow-hidden divide-y divide-white/5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors">
            <div className="flex-shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              {!item.active && (
                <p className="text-xs text-gray-500 mt-1 font-mono">{item.hint}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.active ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">{item.activeLabel}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">{item.inactiveLabel}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Raw output toggle */}
      {data.rawOutput && (
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showRaw ? 'Hide' : 'Show'} CLI output
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">
              {data.rawOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function TrustPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <TrustContent />
    </Suspense>
  )
}
