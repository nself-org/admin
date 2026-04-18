'use client'

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Rocket,
  SkipForward,
  XCircle,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type {
  DeployResult,
  DeployState,
  DeployStep,
  DeployStrategy,
  DeployTarget,
} from './types'

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

interface TargetConfig {
  label: string
  description: string
  badgeClass: string
  ringClass: string
}

const TARGET_CONFIG: Record<DeployTarget, TargetConfig> = {
  local: {
    label: 'Local',
    description: 'Deploy to local stack',
    badgeClass: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    ringClass: 'ring-blue-500/50',
  },
  staging: {
    label: 'Staging',
    description: 'Deploy to staging environment',
    badgeClass: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    ringClass: 'ring-amber-500/50',
  },
  prod: {
    label: 'Production',
    description: 'Deploy to production',
    badgeClass: 'border-red-500/40 text-red-400 bg-red-500/10',
    ringClass: 'ring-red-500/50',
  },
}

interface StrategyConfig {
  label: string
  description: string
}

const STRATEGY_CONFIG: Record<DeployStrategy, StrategyConfig> = {
  rolling: {
    label: 'Rolling',
    description: 'Zero-downtime rolling update',
  },
  'blue-green': {
    label: 'Blue-Green',
    description: 'Traffic switch between two identical environments',
  },
  canary: {
    label: 'Canary',
    description: 'Gradual traffic shift to new version',
  },
  preview: {
    label: 'Preview',
    description: 'Ephemeral preview environment',
  },
}

// ---------------------------------------------------------------------------
// Step status icon
// ---------------------------------------------------------------------------

function StepIcon({ status }: { status: DeployStep['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
    case 'failed':
      return <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
    case 'running':
      return (
        <Loader2 className="text-nself-primary h-4 w-4 flex-shrink-0 animate-spin" />
      )
    case 'skipped':
      return (
        <SkipForward className="text-nself-text-muted h-4 w-4 flex-shrink-0" />
      )
    default:
      return <Circle className="text-nself-text-muted h-4 w-4 flex-shrink-0" />
  }
}

// ---------------------------------------------------------------------------
// Duration formatter
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

// ---------------------------------------------------------------------------
// Production confirm modal
// ---------------------------------------------------------------------------

interface ProdConfirmModalProps {
  strategy: DeployStrategy
  dryRun: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ProdConfirmModal({
  strategy,
  dryRun,
  onConfirm,
  onCancel,
}: ProdConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')
  const confirmed = inputValue === 'confirm'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deploy-prod-title"
      onKeyDown={handleKeyDown}
    >
      <div className="glass-card mx-4 w-full max-w-md p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/15">
            <Rocket className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2
              id="deploy-prod-title"
              className="text-nself-text text-base font-semibold"
            >
              Deploy to Production?
            </h2>
            <p className="text-nself-text-muted mt-1 text-sm">
              Strategy:{' '}
              <span className="text-nself-text font-semibold">
                {STRATEGY_CONFIG[strategy].label}
              </span>
              {dryRun && (
                <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">
                  dry-run
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-xs font-medium text-red-300">
            Type{' '}
            <span className="rounded bg-red-500/20 px-1 font-mono">
              confirm
            </span>{' '}
            to proceed. This will affect live infrastructure.
          </p>
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type confirm to continue"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          aria-label="Type confirm to deploy to production"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />

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
            Deploy to Production
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DeployPanelProps {
  /** Called after a deploy completes (success or failure). */
  onComplete?: (result: DeployResult) => void
}

const INITIAL_STATE: DeployState = {
  status: 'idle',
  target: null,
  strategy: null,
  steps: [],
  startedAt: null,
  duration: null,
  error: null,
  output: '',
}

export function DeployPanel({ onComplete }: DeployPanelProps) {
  const [target, setTarget] = useState<DeployTarget>('local')
  const [strategy, setStrategy] = useState<DeployStrategy>('rolling')
  const [dryRun, setDryRun] = useState(false)
  const [deployState, setDeployState] = useState<DeployState>(INITIAL_STATE)
  const [showProdConfirm, setShowProdConfirm] = useState(false)
  const outputRef = useRef<HTMLTextAreaElement>(null)

  const isRunning = deployState.status === 'running'

  // Auto-scroll output log to bottom when new content arrives
  const scrollOutputToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Deploy execution
  // ---------------------------------------------------------------------------

  async function executeDeploy() {
    setDeployState({
      status: 'running',
      target,
      strategy,
      steps: [{ name: 'Initialising deploy…', status: 'running' }],
      startedAt: new Date().toISOString(),
      duration: null,
      error: null,
      output: '',
    })

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, strategy, dryRun }),
      })

      const data = (await res.json()) as {
        success: boolean
        result?: DeployResult
        error?: string
        details?: string
        output?: string
      }

      if (data.success && data.result) {
        const result = data.result
        setDeployState((prev) => ({
          ...prev,
          status: 'success',
          steps: result.steps,
          duration: result.duration,
          output: result.output,
          error: null,
        }))
        onComplete?.(result)
      } else {
        const errMsg = data.details ?? data.error ?? 'Deploy failed'
        const syntheticResult: DeployResult = {
          success: false,
          target,
          strategy,
          steps: [{ name: 'Deploy', status: 'failed', output: errMsg }],
          duration: 0,
          output: data.output ?? errMsg,
          error: errMsg,
        }
        setDeployState((prev) => ({
          ...prev,
          status: 'failed',
          steps: syntheticResult.steps,
          duration: syntheticResult.duration,
          output: syntheticResult.output,
          error: errMsg,
        }))
        onComplete?.(syntheticResult)
      }
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Network error — deploy request failed'
      const syntheticResult: DeployResult = {
        success: false,
        target,
        strategy,
        steps: [{ name: 'Deploy', status: 'failed', output: errMsg }],
        duration: 0,
        output: errMsg,
        error: errMsg,
      }
      setDeployState((prev) => ({
        ...prev,
        status: 'failed',
        steps: syntheticResult.steps,
        duration: syntheticResult.duration,
        output: syntheticResult.output,
        error: errMsg,
      }))
      onComplete?.(syntheticResult)
    } finally {
      setTimeout(scrollOutputToBottom, 50)
    }
  }

  // ---------------------------------------------------------------------------
  // Deploy button handler — guards prod with confirmation modal
  // ---------------------------------------------------------------------------

  function handleDeployClick() {
    if (target === 'prod') {
      setShowProdConfirm(true)
      return
    }
    executeDeploy()
  }

  function handleProdConfirm() {
    setShowProdConfirm(false)
    executeDeploy()
  }

  function handleProdCancel() {
    setShowProdConfirm(false)
  }

  function handleReset() {
    setDeployState(INITIAL_STATE)
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const targetCfg = TARGET_CONFIG[target]

  function renderStatusBanner() {
    if (deployState.status === 'idle') return null

    if (deployState.status === 'running') {
      return (
        <div className="border-nself-primary/30 bg-nself-primary/10 mb-4 flex items-center gap-2 rounded-lg border px-4 py-3">
          <Loader2 className="text-nself-primary h-4 w-4 animate-spin" />
          <span className="text-nself-text text-sm font-medium">
            Deploying to{' '}
            <span className="nself-gradient-text font-semibold">
              {TARGET_CONFIG[deployState.target ?? 'local'].label}
            </span>
            …
          </span>
        </div>
      )
    }

    if (deployState.status === 'success') {
      return (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">
              Deployed successfully
              {deployState.duration !== null && (
                <span className="ml-2 text-green-400/70">
                  ({formatDuration(deployState.duration)})
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-nself-text-muted hover:text-nself-text text-xs underline-offset-2 hover:underline"
          >
            New deploy
          </button>
        </div>
      )
    }

    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <span className="text-sm font-medium text-red-300">
            {deployState.error ?? 'Deploy failed'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-nself-text-muted hover:text-nself-text ml-4 flex-shrink-0 text-xs underline-offset-2 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      {showProdConfirm && (
        <ProdConfirmModal
          strategy={strategy}
          dryRun={dryRun}
          onConfirm={handleProdConfirm}
          onCancel={handleProdCancel}
        />
      )}

      <div className="glass-card p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-nself-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <Rocket className="text-nself-primary h-5 w-5" />
          </div>
          <div>
            <h2 className="nself-gradient-text text-base font-semibold">
              Deploy Pipeline
            </h2>
            <p className="text-nself-text-muted text-xs">
              Push your stack to any environment
            </p>
          </div>
        </div>

        {/* Status banner */}
        {renderStatusBanner()}

        {deployState.status === 'idle' && (
          <>
            {/* Target selector */}
            <div className="mb-5">
              <label className="text-nself-text-muted mb-2 block text-xs font-semibold tracking-widest uppercase">
                Target
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TARGET_CONFIG) as DeployTarget[]).map((t) => {
                  const cfg = TARGET_CONFIG[t]
                  const isSelected = target === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarget(t)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? `${cfg.badgeClass} ring-1 ${cfg.ringClass}`
                          : 'border-nself-border text-nself-text-muted hover:border-nself-primary/40 hover:text-nself-text'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-nself-text-muted mt-1 text-xs">
                {targetCfg.description}
              </p>
            </div>

            {/* Strategy selector */}
            <div className="mb-5">
              <label className="text-nself-text-muted mb-2 block text-xs font-semibold tracking-widest uppercase">
                Strategy
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(STRATEGY_CONFIG) as DeployStrategy[]).map((s) => {
                  const cfg = STRATEGY_CONFIG[s]
                  const isSelected = strategy === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStrategy(s)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                        isSelected
                          ? 'border-nself-primary bg-nself-primary/10 text-nself-primary ring-nself-primary/50 ring-1'
                          : 'border-nself-border text-nself-text-muted hover:border-nself-primary/40 hover:text-nself-text'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <span className="block font-semibold">{cfg.label}</span>
                      <span className="text-nself-text-muted mt-0.5 block leading-tight">
                        {cfg.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dry Run */}
            <div className="mb-6">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="border-nself-border accent-nself-primary h-4 w-4 rounded"
                />
                <span className="text-nself-text text-sm font-medium">
                  Dry run
                </span>
                <span className="text-nself-text-muted text-xs">
                  — validate without making changes
                </span>
              </label>
            </div>

            {/* Deploy button */}
            <button
              type="button"
              onClick={handleDeployClick}
              disabled={isRunning}
              className="nself-btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Rocket className="h-4 w-4" />
              {dryRun ? 'Dry Run' : 'Deploy'} to {TARGET_CONFIG[target].label}
            </button>
          </>
        )}

        {/* Step list — shown during/after deploy */}
        {deployState.steps.length > 0 && deployState.status !== 'idle' && (
          <div className="mb-4">
            <p className="text-nself-text-muted mb-2 text-xs font-semibold tracking-widest uppercase">
              Steps
            </p>
            <ul className="space-y-1.5">
              {deployState.steps.map((step, idx) => (
                <li
                  key={`${step.name}-${idx}`}
                  className="border-nself-border flex items-center gap-2.5 rounded-lg border px-3 py-2"
                >
                  <StepIcon status={step.status} />
                  <span
                    className={`text-sm ${
                      step.status === 'failed'
                        ? 'text-red-300'
                        : step.status === 'done'
                          ? 'text-nself-text'
                          : step.status === 'running'
                            ? 'text-nself-text'
                            : 'text-nself-text-muted'
                    }`}
                  >
                    {step.name}
                  </span>
                  {step.duration !== undefined && (
                    <span className="text-nself-text-muted ml-auto flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Output log — shown when there is output */}
        {deployState.output && deployState.status !== 'idle' && (
          <div>
            <p className="text-nself-text-muted mb-2 text-xs font-semibold tracking-widest uppercase">
              Output
            </p>
            <textarea
              ref={outputRef}
              readOnly
              value={deployState.output}
              rows={10}
              className="border-nself-border bg-nself-bg text-nself-text-muted w-full resize-y rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none"
              aria-label="Deploy output log"
            />
          </div>
        )}
      </div>
    </>
  )
}
