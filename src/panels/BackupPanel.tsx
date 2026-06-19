/**
 * BackupPanel — admin panel for creating and listing nSelf backups.
 *
 * Purpose: Let admins create named backups and see the backup list with
 *   date and size. All 7 AsyncScreen states handled.
 * Inputs: backup name (Zod validated), /api/system/backups endpoints
 * Outputs: list of backups or appropriate state screens
 * Constraints:
 *   - Backup name: alphanumeric + hyphens/underscores, max 50 chars (Zod)
 *   - Offline = stack not running
 *   - Empty = no backups yet
 *   - Error = fetch or create failure
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: BackupPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { useStackStatus } from '@/hooks/useStackStatus'
import { backupFailedError, err, ok, toAdminError, type Result } from '@/lib/result'
import { backupNameSchema } from '@/lib/validation/admin-forms'
import { Archive, HardDrive, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Backup {
  id: string
  name: string
  type: string
  size: number
  createdAt: string
  status: 'completed' | 'in_progress' | 'failed'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BackupPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [result, setResult] = useState<Result<Backup[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Create-backup form state
  const [backupName, setBackupName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/backups')
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { backups: Backup[] } = await res.json()
      setResult(ok(data.backups))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchBackups()
  }, [fetchBackups, stackIsDown])

  const createBackup = useCallback(async () => {
    const parsed = backupNameSchema.safeParse({ name: backupName })
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? 'Invalid name.')
      return
    }
    setNameError(null)
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/system/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: parsed.data.name }),
      })
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCreateError(backupFailedError(data?.error).userMessage)
        return
      }
      setBackupName('')
      await fetchBackups()
    } catch (e) {
      setCreateError(toAdminError(e).userMessage)
    } finally {
      setCreating(false)
    }
  }, [backupName, fetchBackups])

  // ---------------------------------------------------------------------------
  // Derive state
  // ---------------------------------------------------------------------------

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    if (result.value.length === 0) return 'empty'
    return 'ready'
  })()

  const backups = result?.ok ? result.value : []

  return (
    <section aria-label="Backup Panel" className="space-y-6">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchBackups()
          }}
        />
      )}

      {/* Create backup form */}
      {!stackIsDown && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Backup name
            </label>
            <input
              type="text"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder="my-backup-2026-06-16"
              maxLength={50}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
            />
            {nameError && <p className="text-xs text-red-600 dark:text-red-400">{nameError}</p>}
            {createError && <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>}
          </div>
          <button
            onClick={createBackup}
            disabled={creating || stackIsDown}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating…' : 'Create backup'}
          </button>
        </div>
      )}

      {/* Backup list */}
      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={fetchBackups}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage="No backups yet — create your first backup above."
        emptyAction="Create backup"
        onEmptyAction={() =>
          document.querySelector<HTMLInputElement>('input[placeholder*="backup"]')?.focus()
        }
      >
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {backups.map((backup) => (
            <li key={backup.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Archive className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {backup.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(backup.createdAt)} · {backup.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatBytes(backup.size)}
                </span>
                <span
                  className={
                    backup.status === 'completed'
                      ? 'text-green-600 dark:text-green-400'
                      : backup.status === 'failed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {backup.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </AsyncScreen>
    </section>
  )
}
