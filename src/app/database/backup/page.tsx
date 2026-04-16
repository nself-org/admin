'use client'

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BackupEntry {
  filename: string
  created_at: string
  size_bytes: number
}

type BackupState = 'idle' | 'running' | 'success' | 'error'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BackupRestorePage() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [backupState, setBackupState] = useState<BackupState>('idle')
  const [backupMsg, setBackupMsg] = useState('')

  // Restore state
  const [selectedRestore, setSelectedRestore] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  // ── Fetch backup list ────────────────────────────────────────────────────────

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/admin/backups', { cache: 'no-store' })
      if (!res.ok) {
        setBackups([])
        return
      }
      const data = (await res.json()) as { backups: BackupEntry[] }
      setBackups(data.backups ?? [])
      if (!selectedRestore && (data.backups ?? []).length > 0) {
        setSelectedRestore(data.backups[0].filename)
      }
    } catch {
      setBackups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBackups()
  }, [])

  // ── Create backup ────────────────────────────────────────────────────────────

  const handleCreateBackup = async () => {
    setBackupState('running')
    setBackupMsg('Running nself backup create…')
    try {
      const res = await fetch('/api/admin/backups/create', { method: 'POST' })
      const data = (await res.json()) as { filename?: string; error?: string }
      if (res.ok && data.filename) {
        setBackupState('success')
        setBackupMsg(`Backup created: ${data.filename}`)
        await fetchBackups()
      } else {
        setBackupState('error')
        setBackupMsg(data.error ?? `Backup failed (HTTP ${res.status})`)
      }
    } catch {
      setBackupState('error')
      setBackupMsg('Could not reach the admin API.')
    }
  }

  // ── Restore backup ───────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (confirmText !== 'RESTORE') return
    setRestoring(true)
    setRestoreError('')
    setRestoreSuccess(false)
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedRestore }),
      })
      if (res.ok) {
        setRestoreSuccess(true)
        setConfirmText('')
      } else {
        const data = (await res.json()) as { error?: string }
        setRestoreError(data.error ?? `Restore failed (HTTP ${res.status})`)
      }
    } catch {
      setRestoreError('Could not reach the admin API.')
    } finally {
      setRestoring(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Backup & Restore</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Create and restore database backups via the nself CLI
        </p>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 rounded-xl border border-zinc-700/40 bg-zinc-800/30 px-5 py-4">
        <Archive className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
        <p className="text-sm text-zinc-400">
          Backups include all{' '}
          <span className="font-mono text-zinc-300">np_*</span> plugin tables
          and core database. The latest backup is recommended for restore
          operations.
        </p>
      </div>

      {/* Backup list */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center justify-between border-b border-zinc-700/50 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Existing Backups</h2>
          <button
            type="button"
            onClick={() => void fetchBackups()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-12 animate-pulse rounded-lg bg-zinc-700/40"
              />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Archive className="mb-2 h-7 w-7 text-zinc-700" />
            <p className="text-sm text-zinc-500">No backups found</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Create a backup below to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700/50">
                  {['Filename', 'Date', 'Size', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {backups.map((b) => (
                  <tr
                    key={b.filename}
                    className="transition-colors hover:bg-zinc-700/20"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span className="font-mono text-xs text-zinc-300">
                          {b.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400">
                      {fmtBytes(b.size_bytes)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={`/api/admin/backups/${encodeURIComponent(b.filename)}/download`}
                        className="flex items-center justify-end gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
                        download
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create backup */}
        <div className="space-y-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <h2 className="text-base font-semibold text-white">Create Backup</h2>
          <p className="text-sm text-zinc-400">
            Runs{' '}
            <span className="font-mono text-zinc-300">nself backup create</span>{' '}
            and saves a compressed archive of all databases.
          </p>

          <button
            type="button"
            onClick={() => void handleCreateBackup()}
            disabled={backupState === 'running'}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {backupState === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {backupState === 'running'
              ? 'Creating backup…'
              : 'Create Backup Now'}
          </button>

          {backupState !== 'idle' && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
                backupState === 'success'
                  ? 'border-green-500/30 bg-green-900/20'
                  : backupState === 'error'
                    ? 'border-red-500/30 bg-red-900/20'
                    : 'border-zinc-600/50 bg-zinc-700/30'
              }`}
            >
              {backupState === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
              ) : backupState === 'error' ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-zinc-400" />
              )}
              <p
                className={`text-sm ${
                  backupState === 'success'
                    ? 'text-green-300'
                    : backupState === 'error'
                      ? 'text-red-300'
                      : 'text-zinc-400'
                }`}
              >
                {backupMsg}
              </p>
            </div>
          )}
        </div>

        {/* Restore */}
        <div className="space-y-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <h2 className="text-base font-semibold text-white">Restore</h2>
          <p className="text-sm text-zinc-400">
            Select a backup and confirm to restore. This will overwrite all
            current data.
          </p>

          {/* Backup selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Select backup
            </label>
            <select
              id="restore-backup-select"
              aria-label="Select backup to restore"
              value={selectedRestore}
              onChange={(e) => setSelectedRestore(e.target.value)}
              disabled={backups.length === 0}
              className="w-full appearance-none rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:outline-none disabled:opacity-50"
            >
              {backups.length === 0 ? (
                <option value="">— No backups available —</option>
              ) : (
                backups.map((b) => (
                  <option key={b.filename} value={b.filename}>
                    {b.filename}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Confirmation input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Type <span className="font-mono text-red-400">RESTORE</span> to
              confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setRestoreError('')
                setRestoreSuccess(false)
              }}
              placeholder="RESTORE"
              className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleRestore()}
            disabled={
              confirmText !== 'RESTORE' ||
              !selectedRestore ||
              restoring ||
              backups.length === 0
            }
            className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {restoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {restoring ? 'Restoring…' : 'Restore'}
          </button>

          {restoreSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-900/20 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-300">
                Restore completed successfully.
              </p>
            </div>
          )}

          {restoreError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{restoreError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
