'use client'

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  LicenseSetResult,
  LicenseStatus,
  LicenseValidateResult,
} from './types'

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchLicenseStatus(): Promise<LicenseStatus> {
  const res = await fetch('/api/license')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return (await res.json()) as LicenseStatus
}

async function apiSetLicenseKey(key: string): Promise<LicenseSetResult> {
  const res = await fetch('/api/license/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })
  const body = (await res.json().catch(() => ({}))) as LicenseSetResult & {
    error?: string
  }
  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return body
}

async function apiValidateLicense(): Promise<LicenseValidateResult> {
  const res = await fetch('/api/license/validate', { method: 'POST' })
  const body = (await res.json().catch(() => ({}))) as LicenseValidateResult & {
    error?: string
  }
  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return body
}

async function apiClearLicense(): Promise<void> {
  const res = await fetch('/api/license', { method: 'DELETE' })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

interface TierBadgeProps {
  tier: string
}

function TierBadge({ tier }: TierBadgeProps) {
  const isOwner = tier.toLowerCase().includes('owner')
  const isEnterprise =
    tier.toLowerCase().includes('enterprise') ||
    tier.toLowerCase().includes('business')

  const className = isOwner
    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
    : isEnterprise
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
      : 'bg-nself-primary/20 text-nself-primary border-nself-primary/40'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {tier}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Key row
// ---------------------------------------------------------------------------

interface KeyRowProps {
  maskedKey: string
  displayName: string
  tier: string
  plugins: string[]
  expiresAt: string | null
  valid: boolean
}

function KeyRow({
  maskedKey,
  displayName,
  tier,
  plugins,
  expiresAt,
  valid,
}: KeyRowProps) {
  return (
    <div className="glass-card-elevated space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {valid ? (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
        )}
        <span className="text-nself-text min-w-0 flex-1 truncate font-mono text-sm">
          {maskedKey}
        </span>
        <TierBadge tier={tier} />
      </div>
      <div className="text-nself-text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>
          <span className="text-nself-text font-medium">{displayName}</span>
        </span>
        {expiresAt !== null && (
          <span>
            Expires: <span className="text-nself-text">{expiresAt}</span>
          </span>
        )}
        {expiresAt === null && (
          <span className="text-green-400/80">No expiry</span>
        )}
      </div>
      {plugins.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plugins.map((p) => (
            <span
              key={p}
              className="bg-nself-primary/10 text-nself-primary rounded px-1.5 py-0.5 font-mono text-xs"
            >
              {p}
            </span>
          ))}
        </div>
      )}
      {!valid && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          This key is invalid or expired. Plugins requiring it will not load.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyLicenseState() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="bg-nself-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
        <Shield className="text-nself-primary h-7 w-7" />
      </div>
      <div className="space-y-1">
        <p className="text-nself-text text-sm font-semibold">
          No license configured
        </p>
        <p className="text-nself-text-muted max-w-xs text-xs">
          The free tier includes 25 MIT plugins. Add a license key to unlock
          premium plugin bundles.
        </p>
      </div>
      <a
        href="https://nself.org/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="nself-btn-primary inline-flex items-center gap-2 text-sm"
      >
        View pricing
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Validate result notice
// ---------------------------------------------------------------------------

interface ValidateNoticeProps {
  result: LicenseValidateResult
}

function ValidateNotice({ result }: ValidateNoticeProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        result.valid
          ? 'border-green-500/30 bg-green-500/10 text-green-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
      }`}
    >
      {result.valid ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold">
          {result.valid ? 'License valid' : 'License invalid'}
        </p>
        <p className="text-xs opacity-80">{result.message}</p>
        {result.valid && result.tier && (
          <p className="text-xs opacity-80">
            Tier: <span className="font-medium">{result.tier}</span>
            {result.expiresAt !== null && ` — expires ${result.expiresAt}`}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main LicensePanel
// ---------------------------------------------------------------------------

export function LicensePanel() {
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [newKey, setNewKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null)

  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] =
    useState<LicenseValidateResult | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)

  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)

  const flashTimeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  const scheduleFlashClear = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<string | null>>,
      delayMs: number,
    ) => {
      const id = setTimeout(() => setter(null), delayMs)
      flashTimeouts.current.push(id)
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // Load status
  // ---------------------------------------------------------------------------

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await fetchLicenseStatus()
      setStatus(data)
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to load license status',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    return () => {
      for (const id of flashTimeouts.current) clearTimeout(id)
    }
  }, [loadStatus])

  // ---------------------------------------------------------------------------
  // Activate key
  // ---------------------------------------------------------------------------

  async function handleActivate() {
    const trimmed = newKey.trim()
    if (!trimmed) return
    setActivating(true)
    setActivateError(null)
    setActivateSuccess(null)
    try {
      const result = await apiSetLicenseKey(trimmed)
      if (result.success) {
        setNewKey('')
        setActivateSuccess(result.message || 'License key activated.')
        scheduleFlashClear(setActivateSuccess, 4000)
        await loadStatus()
      } else {
        setActivateError(result.message || 'Activation failed.')
        scheduleFlashClear(setActivateError, 6000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Activation failed.'
      setActivateError(msg)
      scheduleFlashClear(setActivateError, 6000)
    } finally {
      setActivating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Validate
  // ---------------------------------------------------------------------------

  async function handleValidate() {
    setValidating(true)
    setValidateError(null)
    setValidateResult(null)
    try {
      const result = await apiValidateLicense()
      setValidateResult(result)
    } catch (err) {
      setValidateError(
        err instanceof Error ? err.message : 'Validation request failed.',
      )
      scheduleFlashClear(setValidateError, 6000)
    } finally {
      setValidating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Clear
  // ---------------------------------------------------------------------------

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      const id = setTimeout(() => setConfirmClear(false), 5000)
      flashTimeouts.current.push(id)
      return
    }
    setClearing(true)
    setClearError(null)
    setConfirmClear(false)
    try {
      await apiClearLicense()
      setValidateResult(null)
      await loadStatus()
    } catch (err) {
      setClearError(
        err instanceof Error ? err.message : 'Failed to clear license keys.',
      )
      scheduleFlashClear(setClearError, 6000)
    } finally {
      setClearing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="text-nself-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: fetch error
  // ---------------------------------------------------------------------------

  if (fetchError || !status) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <p className="text-sm text-red-400">
          {fetchError ?? 'Failed to load license status'}
        </p>
        <button
          type="button"
          onClick={loadStatus}
          className="nself-btn-primary mt-4 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: main panel
  // ---------------------------------------------------------------------------

  const hasKeys = status.keys.length > 0
  const hasInvalidKey = status.keys.some((k) => !k.valid)

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="nself-gradient px-6 py-4">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-white/80" />
          <div>
            <h2 className="text-lg font-semibold text-white">License</h2>
            <p className="mt-0.5 text-sm text-white/70">
              Manage nSelf plugin bundle keys and validate your subscription.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Invalid key warning */}
        {hasInvalidKey && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              One or more license keys are invalid or expired. Affected plugins
              will not load until a valid key is configured.
            </p>
          </div>
        )}

        {/* Current license keys */}
        <section aria-label="Configured license keys">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
              Configured Keys
            </p>
            {hasKeys && (
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    status.hasLicense ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-nself-text-muted text-xs">
                  {status.hasLicense ? status.activeTier : 'No valid license'}
                </span>
              </div>
            )}
          </div>

          {hasKeys ? (
            <div className="space-y-2">
              {status.keys.map((k) => (
                <KeyRow
                  key={k.key}
                  maskedKey={k.key}
                  displayName={k.displayName}
                  tier={k.tier}
                  plugins={k.plugins}
                  expiresAt={k.expiresAt}
                  valid={k.valid}
                />
              ))}
            </div>
          ) : (
            <EmptyLicenseState />
          )}
        </section>

        {/* Plugins covered */}
        {status.pluginsCovered.length > 0 && (
          <section aria-label="Plugins covered by current license">
            <p className="text-nself-text-muted mb-2 text-xs font-semibold tracking-widest uppercase">
              Plugins Covered
            </p>
            <div className="flex flex-wrap gap-1.5">
              {status.pluginsCovered.map((p) => (
                <span
                  key={p}
                  className="bg-nself-primary/10 text-nself-primary rounded px-2 py-0.5 font-mono text-xs"
                >
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Activate key */}
        <section aria-label="Add a new license key">
          <p className="text-nself-text-muted mb-3 text-xs font-semibold tracking-widest uppercase">
            Activate Key
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="nself_pro_..."
                className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
                aria-label="License key"
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleActivate()
                }}
              />
              <button
                type="button"
                onClick={handleActivate}
                disabled={!newKey.trim() || activating}
                className="nself-btn-primary flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {activating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Key className="h-4 w-4" />
                )}
                {activating ? 'Activating...' : 'Activate'}
              </button>
            </div>

            {activateError && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {activateError}
              </p>
            )}
            {activateSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                {activateSuccess}
              </p>
            )}

            <p className="text-nself-text-muted text-xs">
              Keys are stored securely on disk by the nSelf CLI.{' '}
              <a
                href="https://nself.org/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-nself-primary inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
              >
                Get a license key
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </section>

        {/* Actions: validate + clear */}
        {hasKeys && (
          <section aria-label="License actions">
            <p className="text-nself-text-muted mb-3 text-xs font-semibold tracking-widest uppercase">
              Actions
            </p>

            {validateResult && <ValidateNotice result={validateResult} />}
            {validateError && (
              <p className="mb-3 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {validateError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating}
                className="border-nself-border bg-nself-bg text-nself-text hover:border-nself-primary/50 hover:text-nself-primary flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {validating ? 'Validating...' : 'Validate'}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  confirmClear
                    ? 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border-nself-border bg-nself-bg text-nself-text-muted hover:border-red-500/40 hover:text-red-400'
                }`}
              >
                {clearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {clearing
                  ? 'Clearing...'
                  : confirmClear
                    ? 'Click again to confirm'
                    : 'Clear all keys'}
              </button>
            </div>

            {clearError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {clearError}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
