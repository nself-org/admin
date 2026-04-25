'use client'

import { ServiceDetailSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import type {
  Plugin,
  PluginConfig,
  PluginSyncStatus,
  PluginTableInfo,
  WebhookEvent,
} from '@/types/plugins'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Database,
  ExternalLink,
  Github,
  Plug,
  RefreshCw,
  Save,
  Settings,
  Shield,
  ShoppingCart,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Plugin icon mapping
const pluginIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  stripe: CreditCard,
  shopify: ShoppingCart,
  github: Github,
  default: Plug,
}

function getPluginIcon(name: string) {
  const lowerName = name.toLowerCase()
  for (const [key, Icon] of Object.entries(pluginIcons)) {
    if (lowerName.includes(key)) return Icon
  }
  return pluginIcons.default
}

// Quick Links for each plugin type
const pluginQuickLinks: Record<string, { label: string; href: string }[]> = {
  stripe: [
    { label: 'Customers', href: '/plugins/stripe/customers' },
    { label: 'Subscriptions', href: '/plugins/stripe/subscriptions' },
    { label: 'Invoices', href: '/plugins/stripe/invoices' },
    { label: 'Products', href: '/plugins/stripe/products' },
    { label: 'Webhooks', href: '/plugins/stripe/webhooks' },
  ],
  github: [
    { label: 'Repositories', href: '/plugins/github/repos' },
    { label: 'Issues', href: '/plugins/github/issues' },
    { label: 'Pull Requests', href: '/plugins/github/prs' },
    { label: 'Actions', href: '/plugins/github/actions' },
  ],
  shopify: [
    { label: 'Products', href: '/plugins/shopify/products' },
    { label: 'Orders', href: '/plugins/shopify/orders' },
    { label: 'Customers', href: '/plugins/shopify/customers' },
    { label: 'Inventory', href: '/plugins/shopify/inventory' },
  ],
}

// S71-T03: permission badge colour classification.
// green  = low-risk / scoped  (db:read, network:plugin:*)
// yellow = moderate risk      (network:internet, fs:write:*, ai:provider:*, secrets:env:*)
// red    = high risk           (system:exec)
function permissionBadgeClass(perm: string): string {
  if (perm === 'system:exec') {
    return 'bg-red-500/20 text-red-400 border border-red-500/30'
  }
  if (
    perm === 'network:internet' ||
    perm.startsWith('fs:write:') ||
    perm.startsWith('ai:provider:') ||
    perm.startsWith('secrets:env:')
  ) {
    return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
  }
  return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
}

function PermissionList({ permissions }: { permissions: string[] }) {
  if (permissions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No special permissions declared.</p>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {permissions.map((perm) => (
          <span
            key={perm}
            title={`Permission: ${perm} — v1.0.9: informational only; v1.1.0 will require explicit confirmation`}
            className={`rounded-full px-2.5 py-0.5 font-mono text-xs ${permissionBadgeClass(perm)}`}
          >
            {perm}
          </span>
        ))}
      </div>
      <p className="text-xs text-zinc-600">
        v1.0.9: informational only. v1.1.0 will require explicit confirmation
        before install.
      </p>
    </div>
  )
}

function WebhookEventRow({ event }: { event: WebhookEvent }) {
  const statusColors = {
    received: 'bg-blue-500/20 text-blue-400',
    processed: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
    retrying: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-zinc-300">
          {event.eventType}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${statusColors[event.status]}`}
        >
          {event.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {new Date(event.receivedAt).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {event.retryCount > 0 && `${event.retryCount} retries`}
      </td>
    </tr>
  )
}

function TableInfoRow({ table }: { table: PluginTableInfo }) {
  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-zinc-500" />
          <span className="font-mono text-sm text-zinc-300">
            {table.tableName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {table.rowCount.toLocaleString()} rows
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">{table.size || 'N/A'}</td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {table.lastUpdated
          ? new Date(table.lastUpdated).toLocaleString()
          : 'Never'}
      </td>
    </tr>
  )
}

function PluginDetailContent() {
  const params = useParams()
  const pluginName = params.name as string

  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'overview')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})

  const { data, error, isLoading, mutate } = useSWR<{
    plugin: Plugin
    config: PluginConfig
    syncStatus: PluginSyncStatus
    webhookEvents: WebhookEvent[]
    tables: PluginTableInfo[]
  }>(`/api/plugins/${pluginName}`, fetcher, {
    refreshInterval: 30000,
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch(`/api/plugins/${pluginName}/sync`, { method: 'POST' })
      mutate()
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      await fetch(`/api/plugins/${pluginName}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: configValues }),
      })
      mutate()
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (
      !confirm(
        'Are you sure you want to remove this plugin? This will delete all synced data.',
      )
    ) {
      return
    }
    try {
      await fetch(`/api/plugins/${pluginName}`, { method: 'DELETE' })
      window.location.href = '/plugins'
    } catch (_error) {
      // Handle error
    }
  }

  const Icon = getPluginIcon(pluginName)
  const quickLinks = pluginQuickLinks[pluginName.toLowerCase()] || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-zinc-800/50" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load plugin details</p>
          </div>
        </div>
      </div>
    )
  }

  const { plugin, config, syncStatus, webhookEvents, tables } = data

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/plugins"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plugins
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-700/50">
            <Icon className="h-7 w-7 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white capitalize">
              {plugin.name}
            </h1>
            <p className="text-sm text-zinc-400">{plugin.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={handleRemove}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>

      {/* LiveKit AV E2EE disclosure banner */}
      {pluginName.toLowerCase() === 'livekit' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                AV E2EE not enabled in v1.0.9
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Voice and video call streams are TLS-encrypted in transit but
                pass through LiveKit Server in cleartext at v1.0.9 — not
                end-to-end encrypted. nChat <strong>chat messages</strong> are
                separately E2EE via post-quantum Kyber. SFrame-based AV E2EE is
                planned for v1.1.0.{' '}
                <a
                  href="https://docs.nself.org/docs/chat/encryption-scope"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-300"
                >
                  Encryption scope details
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      {quickLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-white"
            >
              {link.label}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ))}
        </div>
      )}

      {/* Sync Status Card */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {syncStatus.status === 'idle' && (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              )}
              {syncStatus.status === 'syncing' && (
                <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
              )}
              {syncStatus.status === 'error' && (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              {syncStatus.status === 'scheduled' && (
                <Clock className="h-5 w-5 text-yellow-400" />
              )}
              <span className="text-sm font-medium text-white capitalize">
                {syncStatus.status}
              </span>
            </div>
            <div className="text-sm text-zinc-400">
              <span className="text-zinc-500">Last sync:</span>{' '}
              {syncStatus.lastSync
                ? new Date(syncStatus.lastSync).toLocaleString()
                : 'Never'}
            </div>
            <div className="text-sm text-zinc-400">
              <span className="text-zinc-500">Records:</span>{' '}
              {syncStatus.recordsTotal.toLocaleString()}
            </div>
          </div>
          {syncStatus.nextSync && (
            <div className="text-sm text-zinc-500">
              Next sync: {new Date(syncStatus.nextSync).toLocaleString()}
            </div>
          )}
        </div>
        {syncStatus.errors && syncStatus.errors.length > 0 && (
          <div className="mt-3 rounded-lg bg-red-900/20 p-3">
            <p className="text-sm text-red-400">{syncStatus.errors[0]}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-700/50">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'config', label: 'Configuration', icon: Settings },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            { id: 'tables', label: 'Database Tables', icon: Database },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Plugin Info */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
            <h3 className="mb-4 font-medium text-white">Plugin Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Version</dt>
                <dd className="text-sm text-zinc-300">v{plugin.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Author</dt>
                <dd className="text-sm text-zinc-300">{plugin.author}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Category</dt>
                <dd className="text-sm text-zinc-300 capitalize">
                  {plugin.category}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Min nself Version</dt>
                <dd className="text-sm text-zinc-300">
                  {plugin.minNselfVersion}
                </dd>
              </div>
              {plugin.installedAt && (
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Installed</dt>
                  <dd className="text-sm text-zinc-300">
                    {new Date(plugin.installedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Permissions (S71-T03) */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-zinc-400" />
              <h3 className="font-medium text-white">Permissions</h3>
            </div>
            <PermissionList permissions={plugin.permissions ?? []} />
          </div>

          {/* Required Environment Variables */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
            <h3 className="mb-4 font-medium text-white">
              Environment Variables
            </h3>
            <div className="space-y-3">
              <div>
                <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                  Required
                </h4>
                <div className="space-y-1">
                  {plugin.envVars.required.map((envVar) => (
                    <div
                      key={envVar}
                      className="flex items-center gap-2 rounded bg-zinc-900/50 px-2 py-1 font-mono text-sm text-zinc-300"
                    >
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      {envVar}
                    </div>
                  ))}
                </div>
              </div>
              {plugin.envVars.optional.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                    Optional
                  </h4>
                  <div className="space-y-1">
                    {plugin.envVars.optional.map((envVar) => (
                      <div
                        key={envVar}
                        className="rounded bg-zinc-900/50 px-2 py-1 font-mono text-sm text-zinc-400"
                      >
                        {envVar}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-medium text-white">Plugin Configuration</h3>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Webhook URL
              </label>
              <input
                type="text"
                value={config.webhookUrl || ''}
                onChange={(e) =>
                  setConfigValues({
                    ...configValues,
                    webhookUrl: e.target.value,
                  })
                }
                placeholder="https://your-webhook-url.com/webhook"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Sync Interval (minutes)
              </label>
              <input
                type="number"
                value={config.syncInterval || 60}
                onChange={(e) =>
                  setConfigValues({
                    ...configValues,
                    syncInterval: e.target.value,
                  })
                }
                min={5}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={config.enabled}
                onChange={(e) =>
                  setConfigValues({
                    ...configValues,
                    enabled: e.target.checked ? 'true' : 'false',
                  })
                }
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="enabled" className="text-sm text-zinc-300">
                Enable automatic syncing
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <div className="border-b border-zinc-700/50 px-5 py-4">
            <h3 className="font-medium text-white">Recent Webhook Events</h3>
          </div>
          {webhookEvents.length > 0 ? (
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Event Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Retries
                  </th>
                </tr>
              </thead>
              <tbody>
                {webhookEvents.slice(0, 10).map((event) => (
                  <WebhookEventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Webhook className="mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-sm text-zinc-400">No webhook events yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <div className="border-b border-zinc-700/50 px-5 py-4">
            <h3 className="font-medium text-white">Synced Database Tables</h3>
          </div>
          {tables.length > 0 ? (
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Table Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <TableInfoRow key={table.tableName} table={table} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Database className="mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-sm text-zinc-400">No tables synced yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PluginDetailPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <PluginDetailContent />
    </Suspense>
  )
}
