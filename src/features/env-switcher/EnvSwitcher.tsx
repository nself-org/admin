'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Server,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EnvSwitcherState, EnvSwitchResult, EnvTarget } from './types'

// ---------------------------------------------------------------------------
// Badge colours per environment
// ---------------------------------------------------------------------------

interface EnvBadgeConfig {
  label: string
  badgeClass: string
  dotClass: string
  buttonClass: string
}

const ENV_BADGE: Record<EnvTarget, EnvBadgeConfig> = {
  local: {
    label: 'Local',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-400',
    buttonClass:
      'border-blue-500/40 hover:border-blue-400 hover:bg-blue-500/10',
  },
  staging: {
    label: 'Staging',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-400',
    buttonClass:
      'border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10',
  },
  prod: {
    label: 'Production',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    dotClass: 'bg-red-500',
    buttonClass: 'border-red-500/40 hover:border-red-400 hover:bg-red-500/10',
  },
}

// ---------------------------------------------------------------------------
// Confirmation modal
// ---------------------------------------------------------------------------

interface ProdConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
}

function ProdConfirmModal({ onConfirm, onCancel }: ProdConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  const confirmed = inputValue === 'confirm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prod-confirm-title"
      onKeyDown={handleKeyDown}
    >
      <div className="glass-card mx-4 w-full max-w-md p-6">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/15">
            <Server className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2
              id="prod-confirm-title"
              className="text-nself-text text-base font-semibold"
            >
              Switch to Production?
            </h2>
            <p className="text-nself-text-muted mt-1 text-sm">
              All subsequent commands will run against the{' '}
              <span className="font-semibold text-red-400">
                production environment
              </span>
              . This affects live infrastructure.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-xs font-medium text-red-300">
            Type{' '}
            <span className="rounded bg-red-500/20 px-1 font-mono">
              confirm
            </span>{' '}
            to proceed. This cannot be undone automatically.
          </p>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type confirm to continue"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          aria-label="Type confirm to switch to production"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Switch to Production
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface EnvSwitcherProps {
  /** Called after a successful environment switch. */
  onSwitch?: (result: EnvSwitchResult) => void
}

export function EnvSwitcher({ onSwitch }: EnvSwitcherProps) {
  const [state, setState] = useState<EnvSwitcherState>({
    current: 'local',
    available: ['local', 'staging', 'prod'],
    switching: false,
    error: null,
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<EnvTarget | null>(null)
  const [lastResult, setLastResult] = useState<EnvSwitchResult | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // Fetch current env on mount
  // ---------------------------------------------------------------------------

  const refreshCurrentEnv = useCallback(async () => {
    try {
      const res = await fetch('/api/env')
      const data = (await res.json()) as {
        success: boolean
        environments?: Array<{ name: string; isCurrent: boolean }>
      }

      if (data.success && Array.isArray(data.environments)) {
        const currentEntry = data.environments.find((e) => e.isCurrent)
        if (currentEntry) {
          const raw = currentEntry.name.toLowerCase()
          const mapped: EnvTarget =
            raw === 'prod' || raw === 'production'
              ? 'prod'
              : raw === 'staging'
                ? 'staging'
                : 'local'
          setState((prev) => ({ ...prev, current: mapped, error: null }))
        }
      }
    } catch {
      // Non-fatal — keep existing state
    }
  }, [])

  useEffect(() => {
    refreshCurrentEnv()
  }, [refreshCurrentEnv])

  // ---------------------------------------------------------------------------
  // Close dropdown on outside click
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // ---------------------------------------------------------------------------
  // Switch logic
  // ---------------------------------------------------------------------------

  function requestSwitch(target: EnvTarget) {
    setDropdownOpen(false)
    if (target === state.current) return

    if (target === 'prod') {
      // Show confirmation modal first
      setPendingTarget(target)
      return
    }

    performSwitch(target)
  }

  function handleModalConfirm() {
    if (pendingTarget) {
      performSwitch(pendingTarget)
    }
    setPendingTarget(null)
  }

  function handleModalCancel() {
    setPendingTarget(null)
  }

  async function performSwitch(target: EnvTarget) {
    setState((prev) => ({ ...prev, switching: true, error: null }))
    setLastResult(null)

    try {
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch', name: target }),
      })

      const data = (await res.json()) as {
        success: boolean
        output?: string
        error?: string
        details?: string
      }

      if (data.success) {
        const result: EnvSwitchResult = {
          success: true,
          previous: state.current,
          current: target,
          message: data.output ?? `Switched to ${target}`,
        }
        setState((prev) => ({
          ...prev,
          current: target,
          switching: false,
          error: null,
        }))
        setLastResult(result)
        onSwitch?.(result)
      } else {
        const errMsg =
          data.details ?? data.error ?? `Failed to switch to ${target}`
        setState((prev) => ({
          ...prev,
          switching: false,
          error: errMsg,
        }))
        setLastResult({
          success: false,
          previous: state.current,
          current: state.current,
          message: errMsg,
        })
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : `Failed to switch to ${target}`
      setState((prev) => ({ ...prev, switching: false, error: errMsg }))
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const currentConfig = ENV_BADGE[state.current]

  return (
    <>
      {/* Production confirmation modal */}
      {pendingTarget === 'prod' && (
        <ProdConfirmModal
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      <div className="glass-card p-4">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
            Active Environment
          </span>
          {state.switching && (
            <Loader2 className="text-nself-primary h-4 w-4 animate-spin" />
          )}
        </div>

        {/* Current env badge + switcher */}
        <div className="flex items-center gap-3" ref={dropdownRef}>
          {/* Active env indicator */}
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${currentConfig.badgeClass}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${currentConfig.dotClass} ${state.current === 'prod' ? 'animate-pulse' : ''}`}
            />
            {currentConfig.label}
          </div>

          {/* Dropdown trigger */}
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              disabled={state.switching}
              className={`text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${currentConfig.buttonClass}`}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              Switch
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                className="glass-card-elevated absolute top-full right-0 z-30 mt-1 min-w-36 overflow-hidden py-1"
                role="listbox"
                aria-label="Select environment"
              >
                {state.available.map((env) => {
                  const cfg = ENV_BADGE[env]
                  const isActive = env === state.current
                  return (
                    <button
                      key={env}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => requestSwitch(env)}
                      disabled={isActive}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'text-nself-text-muted cursor-default'
                          : 'text-nself-text hover:bg-nself-primary/10 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dotClass}`}
                      />
                      <span>{cfg.label}</span>
                      {isActive && (
                        <CheckCircle2 className="text-nself-primary ml-auto h-3.5 w-3.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Error alert */}
        {state.error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-xs text-red-300">{state.error}</p>
          </div>
        )}

        {/* Success feedback */}
        {lastResult?.success && !state.error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
            <p className="text-xs text-green-300">{lastResult.message}</p>
          </div>
        )}
      </div>
    </>
  )
}
