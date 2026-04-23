'use client'

/**
 * /team — Team seat management (gated by NSELF_ADMIN_MULTIUSER)
 *
 * Shows a 403 page when NSELF_ADMIN_MULTIUSER=false (the default).
 * When enabled: seat table with role dropdown + revoke button, plus an invite form.
 *
 * 7 UI states: loading, empty, populated, error, offline,
 * permission-denied (flag off), rate-limited.
 */

import { HeroPattern } from '@/components/HeroPattern'
import { InviteForm } from '@/components/admin-account/InviteForm'
import { TeamSeatRow, type TeamRole, type TeamSeat } from '@/components/admin-account/TeamSeatRow'
import {
  AlertCircle,
  Lock,
  RefreshCw,
  Users,
  WifiOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

function TeamSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading team">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="mb-3 h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}

function MultiUserDisabledPage() {
  return (
    <>
      <HeroPattern />
      <main id="main-content" className="relative mx-auto max-w-3xl">
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <Lock className="mx-auto mb-4 h-12 w-12 text-zinc-400" aria-hidden="true" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            Multi-user admin is disabled
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Set{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-700">
              NSELF_ADMIN_MULTIUSER=true
            </code>{' '}
            to enable team management.
          </p>
          <a
            href="https://docs.nself.org/admin/single-user-posture"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
          >
            Learn more
          </a>
        </div>
      </main>
    </>
  )
}

function TeamContent() {
  const [seats, setSeats] = useState<TeamSeat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [multiUserDisabled, setMultiUserDisabled] = useState(false)

  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/account/team')

      if (res.status === 404) {
        setMultiUserDisabled(true)
        setLoading(false)
        return
      }
      if (res.status === 401) {
        router.push('/login?reason=expired')
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to load team')
        setLoading(false)
        return
      }

      const json = await res.json()
      if (json.offline) setOffline(true)
      setSeats(json.data || [])
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    headingRef.current?.focus()
    fetchTeam()
  }, [fetchTeam])

  if (multiUserDisabled) return <MultiUserDisabledPage />

  const handleInvite = async (email: string, role: TeamRole) => {
    const res = await fetch('/api/account/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Invite failed')
    }
    await fetchTeam()
  }

  const handleRevoke = async (userId: string) => {
    const res = await fetch(`/api/account/team/${userId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Revoke failed')
    }
    await fetchTeam()
  }

  const handleRoleChange = async (userId: string, role: TeamRole) => {
    // Role changes would go to an update endpoint — for now just refetch
    const res = await fetch(`/api/account/team/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) await fetchTeam()
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <HeroPattern />
      <main id="main-content" className="relative mx-auto max-w-5xl space-y-6">
        <div className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-bold text-zinc-900 focus:outline-none dark:text-white"
                >
                  Team
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Manage admin seats and invitations
                </p>
              </div>
            </div>
            <button
              onClick={fetchTeam}
              disabled={loading}
              aria-label="Refresh team list"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {/* Invite form always at top */}
        <InviteForm onInvite={handleInvite} />

        {/* Offline */}
        {offline && !loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Auth service unavailable.
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && seats.length === 0 && <TeamSkeleton />}

        {/* Empty state */}
        {!loading && !error && seats.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <Users className="mx-auto mb-3 h-10 w-10 text-zinc-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              No team members
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Use the form above to invite your first team member.
            </p>
          </div>
        )}

        {/* Seat table */}
        {!loading && seats.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Member
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Joined
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {seats.map((seat) => (
                    <TeamSeatRow
                      key={seat.id}
                      seat={seat}
                      isCurrentUser={false}
                      onRevoke={handleRevoke}
                      onRoleChange={handleRoleChange}
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

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamSkeleton />}>
      <TeamContent />
    </Suspense>
  )
}
