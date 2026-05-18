'use client'

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface WebhookDelivery {
  id: string
  url: string
  event: string
  status: 'pending' | 'success' | 'failed' | 'retrying'
  statusCode?: number
  sentAt: string
  responseMs?: number
  error?: string
}

interface WebhookData {
  deliveries: WebhookDelivery[]
  total: number
  endpoints: { url: string; events: string[] }[]
}

const STATUS_STYLES: Record<
  WebhookDelivery['status'],
  { icon: React.FC<{ className?: string }>; cls: string; label: string }
> = {
  success: { icon: CheckCircle, cls: 'text-green-400', label: 'Success' },
  failed: { icon: XCircle, cls: 'text-red-400', label: 'Failed' },
  pending: { icon: Clock, cls: 'text-yellow-400', label: 'Pending' },
  retrying: { icon: Loader2, cls: 'text-orange-400', label: 'Retrying' },
}

const SAMPLE_EVENTS = [
  'project.started',
  'project.stopped',
  'service.healthy',
  'service.degraded',
  'backup.completed',
  'deploy.succeeded',
  'deploy.failed',
  'plugin.installed',
]

function WebhooksContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<WebhookData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [testUrl, setTestUrl] = useState('')
  const [testEvent, setTestEvent] = useState(SAMPLE_EVENTS[0])
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/workflows?type=webhook&limit=50')
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${res.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setData(await res.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  async function sendTestWebhook() {
    if (!testUrl.trim()) return
    setSending(true)
    setSendResult(null)
    const csrf =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1] ?? ''
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ action: 'test-webhook', url: testUrl.trim(), event: testEvent }),
      })
      const body = await res.json()
      if (!res.ok) {
        const msg: string = body?.error ?? `Request failed: ${res.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setSendResult({ ok: false, msg })
        }
        return
      }
      setSendResult({ ok: true, msg: body?.message ?? 'Test webhook sent successfully' })
      await fetchDeliveries()
    } catch {
      setSendResult({ ok: false, msg: 'Network error — check URL and try again' })
    } finally {
      setSending(false)
    }
  }

  async function clearDelivery(id: string) {
    const csrf =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1] ?? ''
    try {
      await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrf },
      })
      setData((prev) =>
        prev ? { ...prev, deliveries: prev.deliveries.filter((d) => d.id !== id) } : prev
      )
    } catch {
      /* best-effort */
    }
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself services</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Webhook delivery history requires a running nself stack.
            </p>
          </div>
        </div>
        <Button onClick={fetchDeliveries} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load webhook deliveries</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchDeliveries} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Globe className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No webhook information available.</p>
        <Button
          onClick={fetchDeliveries}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Webhooks
        </Button>
      </div>
    )
  }

  // States 6+7: success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Webhook Tester</h2>
          <p className="mt-1 text-sm text-gray-400">
            Send test events and debug webhook deliveries
          </p>
        </div>
        <Button onClick={fetchDeliveries} disabled={loading} variant="secondary" size="sm">
          {/* State 2: refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* Registered endpoints */}
      {data.endpoints.length > 0 && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">
            Registered Endpoints
          </p>
          <div className="space-y-2">
            {data.endpoints.map((ep, i) => (
              <div key={i} className="flex items-start gap-2">
                <Globe className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <a
                    href={ep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-sky-400 transition-colors hover:text-sky-300"
                  >
                    {ep.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="mt-0.5 text-xs text-gray-500">Events: {ep.events.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test sender */}
      <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-medium text-gray-300">Send Test Event</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Plus className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="url"
              placeholder="https://example.com/webhook"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-4 pl-9 font-mono text-sm text-white placeholder-gray-500 transition-colors focus:border-sky-500/50 focus:outline-none"
            />
          </div>
          <select
            value={testEvent}
            onChange={(e) => setTestEvent(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors focus:border-sky-500/50 focus:outline-none"
          >
            {SAMPLE_EVENTS.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={sendTestWebhook} disabled={!testUrl.trim() || sending} size="sm">
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {sending ? 'Sending…' : 'Send Test'}
        </Button>
        {sendResult && (
          <div
            className={`flex items-center gap-2 text-sm ${sendResult.ok ? 'text-green-400' : 'text-red-400'}`}
          >
            {sendResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {sendResult.msg}
          </div>
        )}
      </div>

      {/* Delivery log */}
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">
          Recent Deliveries ({data.deliveries.length})
        </p>
        {data.deliveries.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <Send className="mx-auto mb-2 h-8 w-8 text-gray-400 opacity-30" />
            <p className="text-gray-400">No webhook deliveries yet.</p>
            <p className="mt-1 text-xs text-gray-500">
              Send a test event or trigger a project action.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
            {data.deliveries.map((delivery) => {
              const s = STATUS_STYLES[delivery.status]
              const Icon = s.icon
              return (
                <div
                  key={delivery.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${s.cls} ${delivery.status === 'retrying' ? 'animate-spin' : ''}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-gray-300">{delivery.event}</span>
                      {delivery.statusCode && (
                        <span
                          className={`font-mono text-xs ${delivery.status === 'success' ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {delivery.statusCode}
                        </span>
                      )}
                      {delivery.responseMs && (
                        <span className="text-xs text-gray-500">{delivery.responseMs}ms</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                      {delivery.url}
                    </p>
                    {delivery.error && (
                      <p className="mt-0.5 text-xs text-red-400">{delivery.error}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {new Date(delivery.sentAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => clearDelivery(delivery.id)}
                      className="text-gray-600 transition-colors hover:text-red-400"
                      aria-label="Remove delivery"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <WebhooksContent />
    </Suspense>
  )
}
