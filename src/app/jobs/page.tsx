'use client'

// ɳSelf Admin — Jobs & Queue (S18-T05)
//
// Thin operator UI for the free `jobs` plugin (PostgreSQL-backed queue).
// Mirrors the style of /cron so operators can jump between scheduler
// (cron) and job queue (jobs) without context switching. Lists queues,
// current jobs by status, and the DLQ with a revive button.

import {
  AlertCircle,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const JOBS_API = 'http://127.0.0.1:3105'

type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

interface Job {
  id: string
  queue: string
  priority: number
  status: JobStatus
  attempts: number
  max_attempts: number
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  error: string | null
  created_at: string
  updated_at: string
}

interface QueueStats {
  name: string
  pending: number
  active: number
  completed: number
  failed: number
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

function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    pending: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
    active: 'bg-sky-500/10 text-sky-400 ring-sky-500/30',
    completed: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
    failed: 'bg-rose-500/10 text-rose-400 ring-rose-500/30',
    cancelled: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/30',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${styles[status]}`}
    >
      {status}
    </span>
  )
}

export default function JobsPage() {
  const [queues, setQueues] = useState<QueueStats[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [dlq, setDlq] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueFilter, setQueueFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (queueFilter) qs.set('queue', queueFilter)
      if (statusFilter) qs.set('status', statusFilter)
      qs.set('limit', '100')

      const [qRes, jRes, dRes] = await Promise.all([
        fetch(`${JOBS_API}/v1/queues`),
        fetch(`${JOBS_API}/v1/jobs?${qs.toString()}`),
        fetch(`${JOBS_API}/v1/dlq?limit=50`),
      ])

      if (qRes.ok) {
        const data = await qRes.json()
        setQueues(data.queues ?? [])
      }
      if (jRes.ok) {
        const data = await jRes.json()
        setJobs(data.jobs ?? [])
      } else {
        setError(`Jobs API returned ${jRes.status}`)
      }
      if (dRes.ok) {
        const data = await dRes.json()
        setDlq(data.jobs ?? [])
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to reach jobs plugin on 127.0.0.1:3105',
      )
    } finally {
      setLoading(false)
    }
  }, [queueFilter, statusFilter])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15_000)
    return () => clearInterval(t)
  }, [refresh])

  const handleRetry = async (id: string) => {
    const res = await fetch(`${JOBS_API}/v1/jobs/${id}/retry`, {
      method: 'POST',
    })
    if (res.ok) refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job permanently?')) return
    const res = await fetch(`${JOBS_API}/v1/jobs/${id}`, { method: 'DELETE' })
    if (res.ok) refresh()
  }

  const handleRevive = async (id: string) => {
    const res = await fetch(`${JOBS_API}/v1/dlq/${id}/revive`, {
      method: 'POST',
    })
    if (res.ok) refresh()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Jobs &amp; Queue</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Background job queue with retries, DLQ, and HMAC-signed HTTP
            callbacks.{' '}
            <Link href="/cron" className="text-sky-400 hover:underline">
              Looking for scheduled jobs? Open Cron →
            </Link>
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Queue stats */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Queues
        </h2>
        {queues.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
            No queues yet. Publish a job via POST /v1/jobs to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {queues.map((q) => (
              <div
                key={q.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="truncate text-sm font-medium text-white">
                  {q.name}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>Pending: <span className="text-amber-400">{q.pending}</span></div>
                  <div>Active: <span className="text-sky-400">{q.active}</span></div>
                  <div>Done: <span className="text-emerald-400">{q.completed}</span></div>
                  <div>Failed: <span className="text-rose-400">{q.failed}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
          placeholder="Filter by queue"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder-zinc-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | '')}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </section>

      {/* Jobs table */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Jobs ({jobs.length})
        </h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
            No jobs matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Queue</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Scheduled</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Error</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900/30">
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="px-3 py-2 font-medium text-white">
                      {j.queue}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {j.attempts}/{j.max_attempts}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatRelative(j.scheduled_at)}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatRelative(j.updated_at)}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 max-w-xs truncate">
                      {j.error ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {j.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(j.id)}
                            title="Retry"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(j.id)}
                          title="Delete"
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DLQ */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Dead Letter Queue ({dlq.length})
        </h2>
        {dlq.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
            DLQ is empty — no permanently-failed jobs.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-rose-500/30 bg-rose-500/5">
            <table className="w-full text-sm">
              <thead className="bg-rose-500/10 text-left text-xs uppercase tracking-wide text-rose-300">
                <tr>
                  <th className="px-3 py-2">Queue</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Last error</th>
                  <th className="px-3 py-2">Failed</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-500/10">
                {dlq.map((j) => (
                  <tr key={j.id}>
                    <td className="px-3 py-2 font-medium text-white">{j.queue}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {j.attempts}/{j.max_attempts}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 max-w-md truncate">
                      {j.error ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatRelative(j.updated_at)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRevive(j.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                      >
                        <Play className="h-3 w-3" />
                        Revive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
