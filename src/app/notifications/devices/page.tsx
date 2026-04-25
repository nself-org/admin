'use client'

/**
 * Device token health page — B19
 *
 * 7 UI states: loading, empty, error, populated, offline, permission-denied, rate-limited
 */

import { TokenHealthTable } from '@/components/notifications/TokenHealthTable'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import {
  NotifyApiError,
  tokens,
  type DeviceToken,
  type Platform,
  type TokenHealthSummary,
} from '@/lib/api/notifications'
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldOff,
  Smartphone,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type PlatformFilter = 'all' | Platform
type ValidityFilter = 'all' | 'valid' | 'invalid'

export default function DevicesPage() {
  const [tokenList, setTokenList] = useState<DeviceToken[]>([])
  const [health, setHealth] = useState<TokenHealthSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [error, setError] = useState<unknown>(null)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    if (!isOnline) return
    setIsLoading(true)
    setError(null)
    try {
      const [healthRes, tokensRes] = await Promise.all([
        tokens.health(),
        tokens.list({
          platform: platformFilter !== 'all' ? platformFilter : undefined,
          valid:
            validityFilter === 'all' ? undefined : validityFilter === 'valid',
          page,
        }),
      ])
      setHealth(healthRes)
      setTokenList(tokensRes.items)
      setTotal(tokensRes.total)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, platformFilter, validityFilter, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      load()
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [load])

  async function handleBulkInvalidate(ids: string[]) {
    try {
      await tokens.bulkInvalidate(ids)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  // ---- State rendering ----

  const renderState = () => {
    if (!isOnline) {
      return (
        <EmptyState
          icon={WifiOff}
          title="Offline"
          description="Device token data is unavailable while offline."
        />
      )
    }

    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center py-24"
          role="status"
          aria-label="Loading tokens"
        >
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )
    }

    if (
      error instanceof NotifyApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      return (
        <EmptyState
          icon={ShieldOff}
          title="Permission denied"
          description="You don't have access to device token management."
        />
      )
    }

    if (error instanceof NotifyApiError && error.status === 429) {
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Rate limited. Try again in a moment.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">
              {error instanceof Error
                ? error.message
                : 'Failed to load device tokens'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return (
      <TokenHealthTable
        tokens={tokenList}
        isLoading={false}
        onBulkInvalidate={handleBulkInvalidate}
      />
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="Device Tokens"
        description="Monitor registered device tokens and their validity"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Push Notifications', href: '/notifications' },
          { label: 'Devices' },
        ]}
        actions={
          !isOnline ? (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          ) : undefined
        }
      />

      <PageContent>
        {/* Health stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total tokens"
            value={health?.total.toLocaleString() ?? '—'}
            icon={Smartphone}
            isLoading={isLoading}
          />
          <StatCard
            title="Valid"
            value={health?.valid.toLocaleString() ?? '—'}
            icon={CheckCircle}
            iconColor="bg-green-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Invalid"
            value={health?.invalid.toLocaleString() ?? '—'}
            icon={XCircle}
            iconColor="bg-red-500"
            isLoading={isLoading}
          />
          <StatCard
            title="FCM / APNs"
            value={health ? `${health.fcm} / ${health.apns}` : '—'}
            icon={Smartphone}
            iconColor="bg-sky-500"
            isLoading={isLoading}
          />
        </div>

        {/* Filters */}
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Platform
              </p>
              <div className="flex gap-2">
                {(['all', 'fcm', 'apns'] as PlatformFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setPlatformFilter(f)
                      setPage(1)
                    }}
                    className={`rounded-md px-3 py-1 text-sm font-medium uppercase transition-colors ${
                      platformFilter === f
                        ? 'bg-sky-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Validity
              </p>
              <div className="flex gap-2">
                {(['all', 'valid', 'invalid'] as ValidityFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setValidityFilter(f)
                      setPage(1)
                    }}
                    className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                      validityFilter === f
                        ? 'bg-sky-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Token table */}
        <Card className="p-4">
          {renderState()}

          {/* Pagination */}
          {!isLoading && !error && tokenList.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{' '}
                of {total.toLocaleString()} tokens
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </PageContent>
    </>
  )
}
