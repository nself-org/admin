'use client'

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Loader2,
  Play,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// ---- Types ------------------------------------------------------------------

type JobDelivery = 'webhook' | 'http' | 'notify' | 'plugin'

interface CronJob {
  id: string
  name: string
  schedule: string
  timezone: string
  delivery: JobDelivery
  webhook_url: string | null
  payload: Record<string, unknown> | null
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  run_count: number
  max_attempts: number
  source_account_id: string
  created_at: string
}

interface HistoryRecord {
  id: string
  job_id: string
  status: 'success' | 'failed'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  response_status: number | null
  error: string | null
  attempt: number
}

interface JobFormData {
  name: string
  schedule: string
  timezone: string
  delivery: JobDelivery
  webhook_url: string
  payload: string
  enabled: boolean
  max_attempts: string
}

// ---- Constants --------------------------------------------------------------

const CRON_API = 'http://127.0.0.1:3713'

const DELIVERY_TYPES: { value: JobDelivery; label: string; hint: string }[] = [
  { value: 'webhook', label: 'Webhook', hint: 'POST payload to a URL' },
  { value: 'http', label: 'HTTP', hint: 'POST to a URL with custom config' },
  { value: 'notify', label: 'Notify', hint: 'Send via nself-notify' },
  { value: 'plugin', label: 'Plugin', hint: 'Trigger a plugin action' },
]

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Every Monday', value: '0 9 * * 1' },
]

function defaultForm(): JobFormData {
  return {
    name: '',
    schedule: '0 * * * *',
    timezone: 'UTC',
    delivery: 'webhook',
    webhook_url: '',
    payload: '{}',
    enabled: true,
    max_attempts: '3',
  }
}

function jobToForm(job: CronJob): JobFormData {
  return {
    name: job.name,
    schedule: job.schedule,
    timezone: job.timezone,
    delivery: job.delivery,
    webhook_url: job.webhook_url ?? '',
    payload: JSON.stringify(job.payload ?? {}, null, 2),
    enabled: job.enabled,
    max_attempts: job.max_attempts.toString(),
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function formatFuture(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'overdue'
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'in <1m'
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `in ${hrs}h`
  return `in ${Math.round(hrs / 24)}d`
}

// ---- Sub-components ---------------------------------------------------------

function JobForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: JobFormData
  onSave: (data: JobFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<JobFormData>(initial)
  const [payloadError, setPayloadError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      JSON.parse(form.payload)
    } catch {
      setPayloadError('Invalid JSON in payload')
      return
    }
    setPayloadError('')
    await onSave(form)
  }

  const needsUrl = form.delivery === 'webhook' || form.delivery === 'http'

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5"
    >
      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Name
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. daily-cleanup"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Schedule */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Schedule (cron expression)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              placeholder="0 * * * *"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
            />
            <select
              value=""
              onChange={(e) => {
                if (e.target.value)
                  setForm({ ...form, schedule: e.target.value })
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-400 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Preset...</option>
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Timezone
          </label>
          <input
            type="text"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            placeholder="UTC"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            IANA name, e.g. America/New_York
          </p>
        </div>
      </div>

      {/* Delivery */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Delivery
          </label>
          <select
            value={form.delivery}
            onChange={(e) =>
              setForm({ ...form, delivery: e.target.value as JobDelivery })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          >
            {DELIVERY_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} — {d.hint}
              </option>
            ))}
          </select>
        </div>

        {needsUrl && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              URL
            </label>
            <input
              type="url"
              required={needsUrl}
              value={form.webhook_url}
              onChange={(e) =>
                setForm({ ...form, webhook_url: e.target.value })
              }
              placeholder="https://example.com/hook"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Payload */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Payload (JSON)
        </label>
        <textarea
          value={form.payload}
          onChange={(e) => setForm({ ...form, payload: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
        />
        {payloadError && (
          <p className="mt-1 text-xs text-red-400">{payloadError}</p>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <input
            id="job-enabled"
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-sky-500"
          />
          <label htmlFor="job-enabled" className="text-sm text-zinc-300">
            Enabled
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-300">Max attempts</label>
          <input
            type="number"
            min={1}
            max={5}
            value={form.max_attempts}
            onChange={(e) => setForm({ ...form, max_attempts: e.target.value })}
            className="w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
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
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Job'}
        </button>
      </div>
    </form>
  )
}

// ---- Main page --------------------------------------------------------------

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [pluginDown, setPluginDown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)
  const [triggerResult, setTriggerResult] = useState<{
    id: string
    ok: boolean
  } | null>(null)

  const fetchAll = async () => {
    try {
      const [jobsRes, histRes] = await Promise.all([
        fetch(`${CRON_API}/cron/jobs`),
        fetch(`${CRON_API}/cron/history?limit=50`),
      ])
      if (!jobsRes.ok) {
        setPluginDown(true)
        return
      }
      setJobs(await jobsRes.json())
      if (histRes.ok) {
        const data = await histRes.json()
        setHistory(data.data ?? [])
      }
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

  const handleSave = async (form: JobFormData) => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        schedule: form.schedule,
        timezone: form.timezone,
        delivery: form.delivery,
        webhook_url: form.webhook_url || null,
        payload: JSON.parse(form.payload),
        enabled: form.enabled,
        max_attempts: parseInt(form.max_attempts),
      }
      if (editingJob) {
        await fetch(`${CRON_API}/cron/jobs/${editingJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`${CRON_API}/cron/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setShowForm(false)
      setEditingJob(null)
      await fetchAll()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`${CRON_API}/cron/jobs/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchAll()
  }

  const handleTrigger = async (job: CronJob) => {
    setTriggeringJob(job.id)
    setTriggerResult(null)
    try {
      const res = await fetch(`${CRON_API}/cron/jobs/${job.id}/run`, {
        method: 'POST',
      })
      setTriggerResult({ id: job.id, ok: res.ok })
    } catch {
      setTriggerResult({ id: job.id, ok: false })
    } finally {
      setTriggeringJob(null)
      setTimeout(() => setTriggerResult(null), 3000)
    }
  }

  if (!loading && pluginDown) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cron Jobs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage scheduled cron jobs
          </p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-cron is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the cron plugin to manage jobs.
              </p>
              <pre className="mt-3 rounded-lg bg-zinc-900/80 px-4 py-3 font-mono text-sm text-zinc-300">
                nself plugin install cron
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const recentHistory = history.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cron Jobs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Schedule and manage recurring tasks with the nself-cron plugin
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingJob(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400"
          >
            <Plus className="h-4 w-4" />
            Add Job
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <JobForm
          initial={editingJob ? jobToForm(editingJob) : defaultForm()}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingJob(null)
          }}
          saving={saving}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-14 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !pluginDown && jobs.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Calendar className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-400">No cron jobs yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400"
          >
            <Plus className="h-4 w-4" />
            Create your first job
          </button>
        </div>
      )}

      {/* Jobs list */}
      {!loading && jobs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Schedule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Last run
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Next run
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Runs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                  Controls
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{job.name}</div>
                    <div className="text-xs text-zinc-500 capitalize">
                      {job.delivery}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-zinc-900/70 px-1.5 py-0.5 text-xs text-zinc-300">
                      {job.schedule}
                    </code>
                    {job.timezone !== 'UTC' && (
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {job.timezone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {formatRelative(job.last_run_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatFuture(job.next_run_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {job.run_count}
                  </td>
                  <td className="px-4 py-3">
                    {job.enabled ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <XCircle className="h-3.5 w-3.5" />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Trigger result */}
                      {triggerResult?.id === job.id && (
                        <span
                          className={`mr-2 text-xs ${triggerResult.ok ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {triggerResult.ok ? 'Triggered' : 'Failed'}
                        </span>
                      )}
                      {/* Trigger button */}
                      <button
                        onClick={() => handleTrigger(job)}
                        disabled={triggeringJob === job.id}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-emerald-400 disabled:opacity-50"
                        aria-label={`Run ${job.name} now`}
                        title="Run now"
                      >
                        {triggeringJob === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      {/* Edit button */}
                      <button
                        onClick={() => {
                          setEditingJob(job)
                          setShowForm(true)
                        }}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                        aria-label={`Edit ${job.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {/* Delete button */}
                      {deleteConfirm === job.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(job.id)}
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
                          onClick={() => setDeleteConfirm(job.id)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400"
                          aria-label={`Delete ${job.name}`}
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

      {/* Run history */}
      {!loading && recentHistory.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium text-white">Recent Runs</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Attempt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((entry) => {
                  const job = jobs.find((j) => j.id === entry.job_id)
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {job?.name ?? entry.job_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.status === 'success' ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Success
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
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {entry.duration_ms != null
                          ? `${entry.duration_ms}ms`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {entry.attempt}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(entry.started_at).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
