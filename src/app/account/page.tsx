'use client'

/**
 * /account — Operator account summary page
 *
 * Shows the authenticated operator's email, tier, license count, last login,
 * and a logout button. Integrates with the existing auth cookie + LokiJS session.
 *
 * 7 UI states: loading, empty (new account), populated, error, offline,
 * permission-denied (unauthenticated), rate-limited.
 */

import { HeroPattern } from '@/components/HeroPattern'
import { useAuth } from '@/contexts/AuthContext'
import {
  AlertCircle,
  Clock,
  CreditCard,
  Key,
  Loader2,
  LogOut,
  RefreshCw,
  User,
  WifiOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface AccountData {
  email: string
  tier: string
  licenseCount: number
  lastLogin: string
}

function AccountSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading account details"
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}

function AccountContent() {
  const [data, setData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const { logout } = useAuth()
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const fetchAccount = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)

    try {
      const res = await fetch('/api/account/me')

      if (res.status === 401) {
        router.push('/login?reason=expired')
        return
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to load account')
        return
      }

      const json = await res.json()
      if (json.offline) {
        setOffline(true)
      }
      setData(json.data)
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  // Focus heading on mount for screen readers (WCAG 2.1 AA focus management)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <>
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <HeroPattern />
      <main id="main-content" className="relative mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <User
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
                  Account
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Operator account summary
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAccount}
                disabled={loading}
                aria-label="Refresh account data"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Refresh
              </button>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400"
              >
                {loggingOut ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )}
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && !data && <AccountSkeleton />}

        {/* Offline banner */}
        {offline && !loading && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Auth service not reachable. Some data may be unavailable.
          </div>
        )}

        {/* Error state */}
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
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">
                Error loading account
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Account data */}
        {data && !loading && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-700">
                <div className="flex items-center justify-between px-6 py-4">
                  <dt className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <User className="h-4 w-4" aria-hidden="true" />
                    Email
                  </dt>
                  <dd className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {data.email}
                  </dd>
                </div>

                <div className="flex items-center justify-between px-6 py-4">
                  <dt className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Tier
                  </dt>
                  <dd className="text-sm font-semibold text-zinc-900 capitalize dark:text-white">
                    {data.tier}
                  </dd>
                </div>

                <div className="flex items-center justify-between px-6 py-4">
                  <dt className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <Key className="h-4 w-4" aria-hidden="true" />
                    Licenses
                  </dt>
                  <dd className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {data.licenseCount}
                  </dd>
                </div>

                <div className="flex items-center justify-between px-6 py-4">
                  <dt className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Last login
                  </dt>
                  <dd className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {data.lastLogin
                      ? new Date(data.lastLogin).toLocaleString()
                      : 'Unknown'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Empty state for new accounts */}
            {data.licenseCount === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <Key
                  className="mx-auto mb-2 h-8 w-8 text-zinc-400"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  No licenses yet
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Visit the{' '}
                  <a
                    href="/licenses"
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    Licenses page
                  </a>{' '}
                  to activate a license key.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountContent />
    </Suspense>
  )
}
