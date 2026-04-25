'use client'

import { Loader2, Trash2, User } from 'lucide-react'
import { useState } from 'react'

export type TeamRole = 'owner' | 'admin' | 'viewer'

export interface TeamSeat {
  id: string
  name: string
  email: string
  role: TeamRole
  avatarUrl?: string
  joinedAt: string
}

interface TeamSeatRowProps {
  seat: TeamSeat
  isCurrentUser: boolean
  onRevoke: (userId: string) => Promise<void>
  onRoleChange: (userId: string, role: TeamRole) => Promise<void>
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  viewer: 'Viewer',
}

export function TeamSeatRow({
  seat,
  isCurrentUser,
  onRevoke,
  onRoleChange,
}: TeamSeatRowProps) {
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    if (!confirm(`Revoke access for ${seat.email}?`)) return
    setRevoking(true)
    setError(null)
    try {
      await onRevoke(seat.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed')
    } finally {
      setRevoking(false)
    }
  }

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await onRoleChange(seat.id, e.target.value as TeamRole)
    } catch {
      setError('Role change failed')
    }
  }

  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {seat.avatarUrl ? (
            <img
              src={seat.avatarUrl}
              alt=""
              aria-hidden="true"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
              <User className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {seat.name}
              {isCurrentUser && (
                <span className="ml-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  You
                </span>
              )}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {seat.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
        {new Date(seat.joinedAt).toLocaleDateString()}
      </td>

      <td className="px-4 py-3">
        <select
          value={seat.role}
          onChange={handleRoleChange}
          disabled={isCurrentUser}
          aria-label={`Role for ${seat.email}`}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleRevoke}
            disabled={revoking || isCurrentUser}
            aria-label={`Revoke seat ${seat.email}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {revoking ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            )}
            {revoking ? 'Revoking…' : 'Revoke'}
          </button>
          {error && (
            <span
              role="alert"
              aria-live="assertive"
              className="text-xs text-red-600 dark:text-red-400"
            >
              {error}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
