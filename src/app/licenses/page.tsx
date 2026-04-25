'use client'

/**
 * /licenses — License management page
 *
 * Sortable table of license keys: prefix, tier, status, machine-bound flag,
 * activate/deactivate buttons. Activating binds the license to instance device-id.
 *
 * 7 UI states: loading, empty, populated, error, offline, permission-denied,
 * rate-limited (error + Retry-After header).
 */

import { HeroPattern } from '@/components/HeroPattern'
// LicenseActivateButton: imported for future use
import { LicenseRow, type License } from '@/components/admin-account/LicenseRow'
import {
  AlertCircle,
  Key,
  // Loader2, — unused import, kept for future loading spinner
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

type SortKey = 'status' | 'tier' | 'keyPrefix'

function LicensesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading licenses">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="mb-3 h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}

function LicensesContent() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortAsc, setSortAsc] = useState(true)

  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const fetchLicenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/account/licenses')

      if (res.status === 401) {
        router.push('/login?reason=expired')
        return
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to load licenses')
        return
      }

      const json = await res.json()
      if (json.offline) setOffline(true)
      setLicenses(json.data || [])
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    headingRef.current?.focus()
    fetchLicenses()
  }, [fetchLicenses])

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/account/licenses/${id}/activate`, {
      method: 'POST',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Activation failed')
    }
    await fetchLicenses()
  }

  const handleDeactivate = async (id: string) => {
    const res = await fetch(`/api/account/licenses/${id}/deactivate`, {
      method: 'POST',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Deactivation failed')
    }
    await fetchLicenses()
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortedLicenses = [...licenses].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })

  const SortHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      scope="col"
      aria-sort={
        sortKey === col ? (sortAsc ? 'ascending' : 'descending') : 'none'
      }
      className="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      onClick={() => toggleSort(col)}
    >
      {label}
      {sortKey === col && (
        <span aria-hidden="true" className="ml-1">
          {sortAsc ? '↑' : '↓'}
        </span>
      )}
    </th>
  )

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <HeroPattern />
      <main id="main-content" className="relative mx-auto max-w-5xl">
        <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Key
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
                  Licenses
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Manage license keys for this instance
                </p>
              </div>
            </div>
            <button
              onClick={fetchLicenses}
              disabled={loading}
              aria-label="Refresh license list"
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

        {/* Offline */}
        {offline && !loading && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Auth service unavailable. License data may be stale.
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
          >
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-red-500"
              aria-hidden="true"
            />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && licenses.length === 0 && <LicensesSkeleton />}

        {/* Empty state */}
        {!loading && !error && licenses.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <Key
              className="mx-auto mb-3 h-10 w-10 text-zinc-400"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              No licenses
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Purchase a license at{' '}
              <a
                href="https://nself.org/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline dark:text-blue-400"
              >
                nself.org/pricing
              </a>
              , then activate it here.
            </p>
          </div>
        )}

        {/* License table */}
        {!loading && sortedLicenses.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                    <SortHeader col="keyPrefix" label="Key" />
                    <SortHeader col="tier" label="Tier" />
                    <SortHeader col="status" label="Status" />
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Machine-bound
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Expires
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {sortedLicenses.map((lic) => (
                    <LicenseRow
                      key={lic.id}
                      license={lic}
                      onActivate={handleActivate}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default function LicensesPage() {
  return (
    <Suspense fallback={<LicensesSkeleton />}>
      <LicensesContent />
    </Suspense>
  )
}
