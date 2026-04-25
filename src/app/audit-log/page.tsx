'use client'

/**
 * /audit-log — Account-scoped audit log page
 *
 * Cursor-paginated table of audit events from the O04 auth service.
 * Filters: event type, date range, actor email.
 * Export via ExportCSVButton.
 *
 * 7 UI states: loading, empty, populated, error, offline, permission-denied
 * (session expired → redirect), rate-limited (error + Retry-After).
 */

import { AdminPagination } from '@/components/admin-account/AdminPagination'
import {
  AuditEventRow,
  type AuditEvent,
} from '@/components/admin-account/AuditEventRow'
import { ExportCSVButton } from '@/components/admin-account/ExportCSVButton'
import { HeroPattern } from '@/components/HeroPattern'
import {
  AlertCircle,
  Filter,
  RefreshCw,
  ScrollText,
  WifiOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

type FilterType = string
const EVENT_TYPES = [
  { value: '', label: 'All Events' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'license.activate', label: 'License Activate' },
  { value: 'license.deactivate', label: 'License Deactivate' },
  { value: 'team.invite', label: 'Team Invite' },
  { value: 'team.revoke', label: 'Team Revoke' },
  { value: 'settings.change', label: 'Settings Change' },
]

const PAGE_SIZE = 50

function AuditLogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading audit log">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="mb-2 h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}

function AuditLogContent() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [prevCursors, setPrevCursors] = useState<string[]>([])
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(
    undefined,
  )
  const [total, setTotal] = useState<number | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<FilterType>('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const buildQueryString = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      if (cursor) params.set('cursor', cursor)
      if (typeFilter) params.set('type', typeFilter)
      if (actorFilter) params.set('actor', actorFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      return params.toString()
    },
    [typeFilter, actorFilter, dateFrom, dateTo],
  )

  const fetchEvents = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      setError(null)
      setOffline(false)
      try {
        const qs = buildQueryString(cursor)
        const res = await fetch(`/api/account/audit?${qs}`)

        if (res.status === 401) {
          router.push('/login?reason=expired')
          return
        }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError(json.error || 'Failed to load audit log')
          setLoading(false)
          return
        }

        const json = await res.json()
        if (json.offline) setOffline(true)
        setEvents(json.events || [])
        setNextCursor(json.nextCursor || null)
        if (json.total !== undefined) setTotal(json.total)
      } catch {
        setOffline(true)
      } finally {
        setLoading(false)
      }
    },
    [buildQueryString, router],
  )

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // Re-fetch when filters change (reset pagination)
  useEffect(() => {
    setCurrentCursor(undefined)
    setPrevCursors([])
    fetchEvents(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, actorFilter, dateFrom, dateTo])

  const handleRefresh = () => {
    fetchEvents(currentCursor)
  }

  const handleNext = () => {
    if (!nextCursor) return
    setPrevCursors((prev) => [...prev, currentCursor ?? ''])
    setCurrentCursor(nextCursor)
    fetchEvents(nextCursor)
  }

  const handlePrev = () => {
    const prev = [...prevCursors]
    const cursor = prev.pop() || undefined
    setPrevCursors(prev)
    setCurrentCursor(cursor)
    fetchEvents(cursor)
  }

  const getCSV = async () => {
    const qs = buildQueryString()
    const res = await fetch(`/api/account/audit?${qs}&format=csv`)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Export failed')
    }
    const json = await res.json()
    if (json.csv) return json.csv
    // Build CSV from current events if server doesn't return csv key
    const headers = 'timestamp,actor,type,ip\n'
    const rows = events
      .map((e) => `"${e.timestamp}","${e.actorEmail}","${e.type}","${e.ip}"`)
      .join('\n')
    return headers + rows
  }

  const hasPrev = prevCursors.length > 0

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <HeroPattern />
      <main id="main-content" className="relative mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ScrollText
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-bold text-zinc-900 focus:outline-none dark:text-white"
                >
                  Audit Log
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Account-scoped security and activity events
                  {total !== null && (
                    <span className="ml-2 font-medium text-zinc-700 dark:text-zinc-300">
                      ({total.toLocaleString()} total)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ExportCSVButton
                getCSV={getCSV}
                filename={`audit-log-${new Date().toISOString().split('T')[0]}.csv`}
              />
              <button
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh audit log"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          role="search"
          aria-label="Filter audit events"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              Filters
            </div>

            {/* Event type */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="type-filter"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Event type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="actor-filter"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Actor
              </label>
              <input
                id="actor-filter"
                type="email"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="Filter by email"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-zinc-500"
              />
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-from"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                From
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-to"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                To
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              />
            </div>

            {(typeFilter || actorFilter || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setTypeFilter('')
                  setActorFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Offline */}
        {offline && !loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Auth service unavailable. Audit data may be incomplete.
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
          >
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-red-500"
              aria-hidden="true"
            />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && events.length === 0 && <AuditLogSkeleton />}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <ScrollText
              className="mx-auto mb-3 h-10 w-10 text-zinc-400"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              No events found
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {typeFilter || actorFilter || dateFrom || dateTo
                ? 'No events match the current filters. Try adjusting the filters.'
                : 'No audit events recorded yet. Events appear here as account activity occurs.'}
            </p>
          </div>
        )}

        {/* Audit event table */}
        {!loading && events.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Timestamp
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Actor
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Event type
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      IP
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {events.map((event) => (
                    <AuditEventRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>

            {(hasPrev || nextCursor) && (
              <AdminPagination
                hasPrev={hasPrev}
                hasNext={!!nextCursor}
                onPrev={handlePrev}
                onNext={handleNext}
                label="audit events"
              />
            )}
          </div>
        )}
      </main>
    </>
  )
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<AuditLogSkeleton />}>
      <AuditLogContent />
    </Suspense>
  )
}
