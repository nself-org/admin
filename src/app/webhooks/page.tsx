'use client'

import { DeliveryLog } from '@/components/webhooks/DeliveryLog'
import { DLQPanel } from '@/components/webhooks/DLQPanel'
import { EndpointList } from '@/components/webhooks/EndpointList'
import {
  DLQEntry,
  WebhookDelivery,
  WebhookEndpoint,
} from '@/components/webhooks/types'
import { Activity, AlertTriangle, Plus, Webhook } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Tab = 'endpoints' | 'deliveries' | 'dlq'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'endpoints',
    label: 'Endpoints',
    icon: <Webhook className="h-4 w-4" />,
  },
  {
    id: 'deliveries',
    label: 'Delivery Log',
    icon: <Activity className="h-4 w-4" />,
  },
  {
    id: 'dlq',
    label: 'Dead-letter Queue',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
]

/**
 * /webhooks — Webhook management page for nSelf Admin.
 *
 * Surfaces:
 *  - Endpoints tab: list, enable/disable, rotate secret, send test, delete
 *  - Delivery Log tab: per-delivery status, attempt count, response code, latency, signed flag
 *  - DLQ tab: quarantined deliveries + re-enqueue button
 *
 * All mutations call the nSelf API routes under /api/webhooks/* which delegate to
 * the webhook dispatcher in cli/internal/webhook/.
 */
export default function WebhooksPage() {
  const [activeTab, setActiveTab] = useState<Tab>('endpoints')
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [dlqEntries, setDLQEntries] = useState<DLQEntry[]>([])
  const [loadingEndpoints, setLoadingEndpoints] = useState(true)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [loadingDLQ, setLoadingDLQ] = useState(false)

  // --- Data fetching ---

  const fetchEndpoints = useCallback(async () => {
    setLoadingEndpoints(true)
    try {
      const res = await fetch('/api/webhooks/endpoints')
      if (res.ok) setEndpoints(await res.json())
    } finally {
      setLoadingEndpoints(false)
    }
  }, [])

  const fetchDeliveries = useCallback(async () => {
    setLoadingDeliveries(true)
    try {
      const res = await fetch('/api/webhooks/deliveries?limit=50')
      if (res.ok) setDeliveries(await res.json())
    } finally {
      setLoadingDeliveries(false)
    }
  }, [])

  const fetchDLQ = useCallback(async () => {
    setLoadingDLQ(true)
    try {
      const res = await fetch('/api/webhooks/dlq')
      if (res.ok) setDLQEntries(await res.json())
    } finally {
      setLoadingDLQ(false)
    }
  }, [])

  useEffect(() => {
    fetchEndpoints()
  }, [fetchEndpoints])

  useEffect(() => {
    if (activeTab === 'deliveries') fetchDeliveries()
    if (activeTab === 'dlq') fetchDLQ()
  }, [activeTab, fetchDeliveries, fetchDLQ])

  // --- Mutations ---

  const handleToggle = async (id: string) => {
    const ep = endpoints.find((e) => e.id === id)
    if (!ep) return
    await fetch(`/api/webhooks/endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !ep.enabled }),
    })
    setEndpoints((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
    )
  }

  const handleRotateSecret = async (id: string) => {
    const res = await fetch(`/api/webhooks/endpoints/${id}/rotate-secret`, {
      method: 'POST',
    })
    if (res.ok) {
      const updated: WebhookEndpoint = await res.json()
      setEndpoints((prev) => prev.map((e) => (e.id === id ? updated : e)))
    }
  }

  const handleTest = async (id: string) => {
    const res = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint_id: id }),
    })
    const data = await res.json()
    return {
      success: res.ok && data.success,
      response: data.response,
      error: data.error,
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook endpoint? This cannot be undone.')) return
    await fetch(`/api/webhooks/endpoints/${id}`, { method: 'DELETE' })
    setEndpoints((prev) => prev.filter((e) => e.id !== id))
  }

  const handleReEnqueue = async (id: string) => {
    await fetch(`/api/webhooks/dlq/${id}/re-enqueue`, { method: 'POST' })
    // Refresh DLQ to reflect re_enqueued_at timestamp.
    await fetchDLQ()
  }

  // --- Render ---

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
            <Webhook className="h-8 w-8 text-sky-500" />
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage endpoints, monitor delivery logs, and handle dead-letter
            queue entries.
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: open create-endpoint modal (out of G03 scope)
          }}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
        >
          <Plus className="h-4 w-4" />
          New Endpoint
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'dlq' && dlqEntries.length > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                {dlqEntries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'endpoints' && (
        <EndpointList
          endpoints={endpoints}
          isLoading={loadingEndpoints}
          onToggle={handleToggle}
          onRotateSecret={handleRotateSecret}
          onTest={handleTest}
          onDelete={handleDelete}
        />
      )}

      {activeTab === 'deliveries' && (
        <DeliveryLog deliveries={deliveries} isLoading={loadingDeliveries} />
      )}

      {activeTab === 'dlq' && (
        <DLQPanel
          entries={dlqEntries}
          isLoading={loadingDLQ}
          onReEnqueue={handleReEnqueue}
        />
      )}
    </div>
  )
}
