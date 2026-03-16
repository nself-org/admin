'use client'

import {
  AlertCircle,
  Bell,
  CheckCircle,
  Edit2,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// ---- Types ------------------------------------------------------------------

type ChannelType = 'email' | 'sms' | 'push' | 'slack' | 'telegram' | 'webhook'

interface NotifyChannel {
  id: string
  name: string
  channel_type: ChannelType
  config: Record<string, unknown>
  active: boolean
  auto_delete_minutes: number | null
  rate_limit_per_minute: number | null
  created_at: string
}

interface LogEntry {
  id: string
  channel_name: string
  template_name: string | null
  rendered_title: string
  rendered_body: string
  status: 'sent' | 'failed' | 'rate_limited'
  error: string | null
  created_at: string
  delivered_at: string | null
}

interface ChannelFormData {
  name: string
  channel_type: ChannelType
  config: string
  active: boolean
  auto_delete_minutes: string
  rate_limit_per_minute: string
}

// ---- Constants --------------------------------------------------------------

const NOTIFY_API = 'http://127.0.0.1:3712'

const CHANNEL_TYPES: { value: ChannelType; label: string; configHint: string }[] = [
  {
    value: 'email',
    label: 'Email',
    configHint: '{"to": "user@example.com"}',
  },
  {
    value: 'sms',
    label: 'SMS',
    configHint: '{"phone": "+15551234567"}',
  },
  {
    value: 'push',
    label: 'Push',
    configHint: '{"fcm_token": "your-fcm-token"}',
  },
  {
    value: 'slack',
    label: 'Slack',
    configHint: '{"webhook_url": "https://hooks.slack.com/..."}',
  },
  {
    value: 'telegram',
    label: 'Telegram',
    configHint: '{"bot_token": "123:ABC...", "chat_id": "-100..."}',
  },
  {
    value: 'webhook',
    label: 'Webhook',
    configHint: '{"url": "https://example.com/hook"}',
  },
]

function defaultForm(): ChannelFormData {
  return {
    name: '',
    channel_type: 'webhook',
    config: '{}',
    active: true,
    auto_delete_minutes: '',
    rate_limit_per_minute: '',
  }
}

function channelToForm(ch: NotifyChannel): ChannelFormData {
  return {
    name: ch.name,
    channel_type: ch.channel_type,
    config: JSON.stringify(ch.config, null, 2),
    active: ch.active,
    auto_delete_minutes: ch.auto_delete_minutes?.toString() ?? '',
    rate_limit_per_minute: ch.rate_limit_per_minute?.toString() ?? '',
  }
}

// ---- Sub-components ---------------------------------------------------------

function ChannelForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: ChannelFormData
  onSave: (data: ChannelFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<ChannelFormData>(initial)
  const [configError, setConfigError] = useState('')

  const typeMeta =
    CHANNEL_TYPES.find((t) => t.value === form.channel_type) ?? CHANNEL_TYPES[5]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      JSON.parse(form.config)
    } catch {
      setConfigError('Invalid JSON in config')
      return
    }
    setConfigError('')
    await onSave(form)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. alerts-telegram"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Type</label>
          <select
            value={form.channel_type}
            onChange={(e) =>
              setForm({ ...form, channel_type: e.target.value as ChannelType })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {CHANNEL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Config JSON */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Config (JSON)
        </label>
        <p className="mb-1.5 text-xs text-zinc-500">
          Example: <code className="font-mono">{typeMeta.configHint}</code>
        </p>
        <textarea
          required
          value={form.config}
          onChange={(e) => setForm({ ...form, config: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
        {configError && <p className="mt-1 text-xs text-red-400">{configError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active */}
        <div className="flex items-center gap-2">
          <input
            id="ch-active"
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-500"
          />
          <label htmlFor="ch-active" className="text-sm text-zinc-300">
            Active
          </label>
        </div>

        {/* Rate limit */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Rate limit (per min)
          </label>
          <input
            type="number"
            min={1}
            value={form.rate_limit_per_minute}
            onChange={(e) => setForm({ ...form, rate_limit_per_minute: e.target.value })}
            placeholder="Unlimited"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Auto-delete (Telegram only) */}
        {form.channel_type === 'telegram' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Auto-delete (min)
            </label>
            <input
              type="number"
              min={1}
              value={form.auto_delete_minutes}
              onChange={(e) => setForm({ ...form, auto_delete_minutes: e.target.value })}
              placeholder="Never"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-700/50 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Channel'}
        </button>
      </div>
    </form>
  )
}

// ---- Main page --------------------------------------------------------------

export default function NotifyChannelsPage() {
  const [channels, setChannels] = useState<NotifyChannel[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pluginDown, setPluginDown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotifyChannel | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(
    null
  )

  const fetchAll = async () => {
    try {
      const [chRes, logRes] = await Promise.all([
        fetch(`${NOTIFY_API}/notify/channels`),
        fetch(`${NOTIFY_API}/notify/log?limit=50`),
      ])
      if (!chRes.ok) {
        setPluginDown(true)
        return
      }
      setChannels(await chRes.json())
      if (logRes.ok) setLog(await logRes.json())
      setPluginDown(false)
    } catch {
      setPluginDown(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleSave = async (form: ChannelFormData) => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        channel_type: form.channel_type,
        config: JSON.parse(form.config),
        active: form.active,
        auto_delete_minutes: form.auto_delete_minutes
          ? parseInt(form.auto_delete_minutes)
          : null,
        rate_limit_per_minute: form.rate_limit_per_minute
          ? parseInt(form.rate_limit_per_minute)
          : null,
      }
      if (editingChannel) {
        await fetch(`${NOTIFY_API}/notify/channels/${editingChannel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`${NOTIFY_API}/notify/channels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setShowForm(false)
      setEditingChannel(null)
      await fetchAll()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`${NOTIFY_API}/notify/channels/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchAll()
  }

  const handleTest = async (ch: NotifyChannel) => {
    setTestingChannel(ch.id)
    setTestResult(null)
    try {
      const res = await fetch(`${NOTIFY_API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: ch.channel_type,
          title: 'nAdmin test',
          body: `Test message from nAdmin for channel "${ch.name}"`,
          to: ch.config,
        }),
      })
      const ok = res.ok
      setTestResult({
        id: ch.id,
        ok,
        msg: ok ? 'Message sent successfully' : `HTTP ${res.status}`,
      })
    } catch (err) {
      setTestResult({ id: ch.id, ok: false, msg: String(err) })
    } finally {
      setTestingChannel(null)
    }
  }

  if (!loading && pluginDown) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Notify Channels</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage nself-notify delivery channels
          </p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">nself-notify is not running</p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the notify plugin to manage channels.
              </p>
              <pre className="mt-3 rounded-lg bg-zinc-900/80 px-4 py-3 text-sm font-mono text-zinc-300">
                nself plugin install notify
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Notify Channels</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure named delivery channels for the nself-notify plugin
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingChannel(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <ChannelForm
          initial={editingChannel ? channelToForm(editingChannel) : defaultForm()}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingChannel(null)
          }}
          saving={saving}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !pluginDown && channels.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Bell className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-400">No channels configured yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add your first channel
          </button>
        </div>
      )}

      {/* Channel list */}
      {!loading && channels.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Rate limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Controls</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr
                  key={ch.id}
                  className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3 font-medium text-white">{ch.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-300 capitalize">
                      {ch.channel_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {ch.rate_limit_per_minute ? `${ch.rate_limit_per_minute}/min` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {ch.active ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <XCircle className="h-3.5 w-3.5" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Test result inline */}
                      {testResult?.id === ch.id && (
                        <span
                          className={`mr-2 text-xs ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {testResult.msg}
                        </span>
                      )}
                      {/* Test button */}
                      <button
                        onClick={() => handleTest(ch)}
                        disabled={testingChannel === ch.id}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-indigo-400 disabled:opacity-50"
                        aria-label={`Test ${ch.name}`}
                        title="Send test message"
                      >
                        {testingChannel === ch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                      {/* Edit button */}
                      <button
                        onClick={() => {
                          setEditingChannel(ch)
                          setShowForm(true)
                        }}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                        aria-label={`Edit ${ch.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {/* Delete button */}
                      {deleteConfirm === ch.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(ch.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/30"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded p-1 text-zinc-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(ch.id)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400"
                          aria-label={`Delete ${ch.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delivery log */}
      {!loading && log.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium text-white">Recent Deliveries</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-300">{entry.channel_name}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-sm text-zinc-300">
                      {entry.rendered_title}
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === 'sent' ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Sent
                        </span>
                      ) : entry.status === 'rate_limited' ? (
                        <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Rate limited
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1.5 text-xs text-red-400"
                          title={entry.error ?? undefined}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
