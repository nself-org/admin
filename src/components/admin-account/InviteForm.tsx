'use client'

import { Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { TeamRole } from './TeamSeatRow'

interface InviteFormProps {
  onInvite: (email: string, role: TeamRole) => Promise<void>
}

const ROLES: { value: TeamRole; label: string }[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
]

export function InviteForm({ onInvite }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('viewer')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.includes('@')) {
      setError('Enter a valid email address')
      return
    }

    setLoading(true)
    try {
      await onInvite(email, role)
      setSuccess(`Invite sent to ${email}`)
      setEmail('')
      setRole('viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
      aria-label="Invite team member"
    >
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
        Invite Team Member
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label
            htmlFor="invite-email"
            className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            autoComplete="email"
            aria-label="Email address"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-zinc-500"
          />
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            aria-label="Role"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>

      {success && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-sm text-green-600 dark:text-green-400"
        >
          {success}
        </p>
      )}

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </form>
  )
}
