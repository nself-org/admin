'use client'

import {
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface User {
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'invited' | 'suspended'
  mfaEnabled: boolean
  joinedAt: string | null
}

type ActionInProgress =
  | { type: 'role'; email: string }
  | { type: 'mfa-reset'; email: string }
  | { type: 'remove'; email: string }
  | { type: 'resend'; email: string }
  | null

type ConfirmState =
  | { type: 'remove'; email: string }
  | { type: 'mfa-reset'; email: string }
  | null

// ── Badge helpers ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: User['role'] }) {
  const colours: Record<User['role'], string> = {
    owner:
      'border-violet-500/40 bg-violet-500/10 text-violet-400',
    admin:
      'border-sky-500/40 bg-sky-500/10 text-sky-400',
    member:
      'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    viewer:
      'border-zinc-500/40 bg-zinc-500/10 text-zinc-400',
  }
  const labels: Record<User['role'], string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
  }
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${colours[role]}`}
    >
      {labels[role]}
    </span>
  )
}

function StatusBadge({ status }: { status: User['status'] }) {
  const colours: Record<User['status'], string> = {
    active:
      'border-green-500/40 bg-green-500/10 text-green-400',
    invited:
      'border-amber-500/40 bg-amber-500/10 text-amber-400',
    suspended:
      'border-red-500/40 bg-red-500/10 text-red-400',
  }
  const labels: Record<User['status'], string> = {
    active: 'Active',
    invited: 'Invited',
    suspended: 'Suspended',
  }
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${colours[status]}`}
    >
      {labels[status]}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<User['role']>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Per-row inline role editing
  const [editingRole, setEditingRole] = useState<{
    email: string
    role: User['role']
  } | null>(null)

  // Action in-progress tracker
  const [actionInProgress, setActionInProgress] =
    useState<ActionInProgress>(null)

  // Confirmation state (inline)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  // Row-level feedback
  const [rowMsg, setRowMsg] = useState<{
    email: string
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/users', { cache: 'no-store' })
      if (!res.ok) {
        setFetchError(`Failed to load members (HTTP ${res.status})`)
        setUsers([])
        return
      }
      const json = (await res.json()) as {
        success: boolean
        data?: User[]
        message?: string
        error?: string
      }
      if (json.success) {
        setUsers(json.data ?? [])
      } else {
        setFetchError(json.error ?? 'Failed to load members')
        setUsers([])
      }
    } catch {
      setFetchError('Could not reach the admin API.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  // ── Invite ────────────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (res.ok && json.success) {
        setInviteMsg({ type: 'success', text: `Invite sent to ${inviteEmail.trim()}.` })
        setInviteEmail('')
        setInviteRole('member')
        await fetchUsers()
      } else {
        setInviteMsg({
          type: 'error',
          text: json.error ?? `Invite failed (HTTP ${res.status})`,
        })
      }
    } catch {
      setInviteMsg({ type: 'error', text: 'Could not reach the admin API.' })
    } finally {
      setInviting(false)
    }
  }

  // ── Remove ────────────────────────────────────────────────────────────────────

  const handleRemove = async (email: string) => {
    setActionInProgress({ type: 'remove', email })
    setRowMsg(null)
    setConfirm(null)
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (res.ok && json.success) {
        setRowMsg({ email, type: 'success', text: 'Member removed.' })
        await fetchUsers()
      } else {
        setRowMsg({
          email,
          type: 'error',
          text: json.error ?? `Remove failed (HTTP ${res.status})`,
        })
      }
    } catch {
      setRowMsg({ email, type: 'error', text: 'Could not reach the admin API.' })
    } finally {
      setActionInProgress(null)
    }
  }

  // ── Update role ───────────────────────────────────────────────────────────────

  const handleUpdateRole = async (email: string, role: User['role']) => {
    setActionInProgress({ type: 'role', email })
    setRowMsg(null)
    setEditingRole(null)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'role', role }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (res.ok && json.success) {
        setRowMsg({ email, type: 'success', text: `Role updated to ${role}.` })
        await fetchUsers()
      } else {
        setRowMsg({
          email,
          type: 'error',
          text: json.error ?? `Update failed (HTTP ${res.status})`,
        })
      }
    } catch {
      setRowMsg({ email, type: 'error', text: 'Could not reach the admin API.' })
    } finally {
      setActionInProgress(null)
    }
  }

  // ── Reset MFA ─────────────────────────────────────────────────────────────────

  const handleMfaReset = async (email: string) => {
    setActionInProgress({ type: 'mfa-reset', email })
    setRowMsg(null)
    setConfirm(null)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'mfa-reset' }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (res.ok && json.success) {
        setRowMsg({
          email,
          type: 'success',
          text: 'MFA reset. User will need to re-enroll.',
        })
        await fetchUsers()
      } else {
        setRowMsg({
          email,
          type: 'error',
          text: json.error ?? `MFA reset failed (HTTP ${res.status})`,
        })
      }
    } catch {
      setRowMsg({ email, type: 'error', text: 'Could not reach the admin API.' })
    } finally {
      setActionInProgress(null)
    }
  }

  // ── Resend invite ─────────────────────────────────────────────────────────────

  const handleResend = async (email: string) => {
    setActionInProgress({ type: 'resend', email })
    setRowMsg(null)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'resend' }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (res.ok && json.success) {
        setRowMsg({ email, type: 'success', text: 'Invite resent.' })
      } else {
        setRowMsg({
          email,
          type: 'error',
          text: json.error ?? `Resend failed (HTTP ${res.status})`,
        })
      }
    } catch {
      setRowMsg({ email, type: 'error', text: 'Could not reach the admin API.' })
    } finally {
      setActionInProgress(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const isRowBusy = (email: string) =>
    actionInProgress !== null && actionInProgress.email === email

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="nself-gradient-text text-2xl font-semibold">
          User Management
        </h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Manage team members, roles, and MFA settings
        </p>
      </div>

      {/* Fetch error banner */}
      {fetchError !== null && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/20 px-5 py-4">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{fetchError}</p>
        </div>
      )}

      {/* Invite form */}
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Invite Member</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Email */}
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Email address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value)
                setInviteMsg(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleInvite()
              }}
              placeholder="team@example.com"
              className="nself-input"
            />
          </div>

          {/* Role */}
          <div className="w-full space-y-1.5 sm:w-40">
            <label className="text-sm font-medium text-zinc-300">Role</label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as User['role'])
              }
              aria-label="Invite role"
              className="nself-input appearance-none"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={() => void handleInvite()}
            disabled={inviting || !inviteEmail.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>

        {inviteMsg !== null && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg border px-4 py-3 ${
              inviteMsg.type === 'success'
                ? 'border-green-500/30 bg-green-900/20'
                : 'border-red-500/30 bg-red-900/20'
            }`}
          >
            {inviteMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <p
              className={`text-sm ${inviteMsg.type === 'success' ? 'text-green-300' : 'text-red-300'}`}
            >
              {inviteMsg.text}
            </p>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="glass-card">
        <div className="flex items-center justify-between border-b border-zinc-700/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Members</h2>
            {!loading && (
              <span className="rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs text-zinc-400">
                {users.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void fetchUsers()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-14">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <p className="text-sm text-zinc-400">Loading…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Users className="mb-3 h-8 w-8 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">
              No members yet. Invite someone to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700/50">
                  {['Email', 'Role', 'Status', 'MFA', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/30">
                {users.map((user) => {
                  const busy = isRowBusy(user.email)
                  const isEditing =
                    editingRole !== null && editingRole.email === user.email
                  const isConfirmingRemove =
                    confirm !== null &&
                    confirm.type === 'remove' &&
                    confirm.email === user.email
                  const isConfirmingMfa =
                    confirm !== null &&
                    confirm.type === 'mfa-reset' &&
                    confirm.email === user.email

                  return (
                    <tr
                      key={user.email}
                      className="transition-colors hover:bg-zinc-700/10"
                    >
                      {/* Email */}
                      <td className="px-5 py-3">
                        <span className="text-sm text-zinc-200">
                          {user.email}
                        </span>
                        {rowMsg !== null && rowMsg.email === user.email && (
                          <div
                            className={`mt-1 flex items-center gap-1 text-xs ${rowMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {rowMsg.type === 'success' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {rowMsg.text}
                          </div>
                        )}
                      </td>

                      {/* Role (inline edit) */}
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingRole.role}
                              onChange={(e) =>
                                setEditingRole({
                                  email: user.email,
                                  role: e.target.value as User['role'],
                                })
                              }
                              aria-label={`Change role for ${user.email}`}
                              className="rounded border border-zinc-600/50 bg-zinc-800/80 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500/50 focus:outline-none"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                              <option value="owner">Owner</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                void handleUpdateRole(
                                  user.email,
                                  editingRole.role,
                                )
                              }
                              disabled={busy}
                              className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRole(null)}
                              className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRole({
                                email: user.email,
                                role: user.role,
                              })
                            }
                            disabled={busy}
                            title="Update Role"
                            className="disabled:opacity-50"
                          >
                            <RoleBadge role={user.role} />
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* MFA */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <Shield
                            className={`h-4 w-4 ${user.mfaEnabled ? 'text-green-400' : 'text-zinc-600'}`}
                          />
                          <span
                            className={`text-xs ${user.mfaEnabled ? 'text-green-400' : 'text-zinc-500'}`}
                          >
                            {user.mfaEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Resend invite — only for invited users */}
                          {user.status === 'invited' && (
                            <button
                              type="button"
                              onClick={() => void handleResend(user.email)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                            >
                              {busy &&
                              actionInProgress?.type === 'resend' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              Resend Invite
                            </button>
                          )}

                          {/* Reset MFA */}
                          {user.mfaEnabled && (
                            <>
                              {isConfirmingMfa ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-zinc-400">
                                    Reset MFA for{' '}
                                    <span className="font-medium text-zinc-200">
                                      {user.email}
                                    </span>
                                    ?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleMfaReset(user.email)
                                    }
                                    disabled={busy}
                                    className="rounded bg-amber-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                                  >
                                    {busy &&
                                    actionInProgress?.type === 'mfa-reset' ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Confirm'
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirm(null)}
                                    className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirm({
                                      type: 'mfa-reset',
                                      email: user.email,
                                    })
                                  }
                                  disabled={busy}
                                  className="flex items-center gap-1 rounded border border-zinc-600/50 bg-zinc-700/30 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                                >
                                  <Shield className="h-3 w-3" />
                                  Reset MFA
                                </button>
                              )}
                            </>
                          )}

                          {/* Remove member */}
                          {isConfirmingRemove ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-400">
                                Remove{' '}
                                <span className="font-medium text-zinc-200">
                                  {user.email}
                                </span>
                                ?
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleRemove(user.email)}
                                disabled={busy}
                                className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                              >
                                {busy &&
                                actionInProgress?.type === 'remove' ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirm(null)}
                                className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirm({
                                  type: 'remove',
                                  email: user.email,
                                })
                              }
                              disabled={busy}
                              title="Remove Member"
                              className="rounded p-1.5 text-zinc-500 transition hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
