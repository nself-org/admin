'use client'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Rocket,
  ShieldAlert,
} from 'lucide-react'
import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PromotionStage = 'diff' | 'preflight' | 'deploy' | 'verify' | 'done'

interface PromotionStep {
  stage: PromotionStage
  label: string
  description: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  detail?: string
}

interface PromotionDiff {
  filesChanged: number
  servicesChanged: string[]
  envChanged: string[]
  imagesChanged: string[]
  lastStagingDeploy: string | null
}

interface PromotionState {
  status: 'idle' | 'previewing' | 'ready' | 'running' | 'success' | 'failed'
  steps: PromotionStep[]
  diff: PromotionDiff | null
  error: string | null
}

const INITIAL_STEPS: PromotionStep[] = [
  {
    stage: 'diff',
    label: 'Compute staging-to-prod diff',
    description: 'Compare services, env vars, and images',
    status: 'pending',
  },
  {
    stage: 'preflight',
    label: 'Preflight checks',
    description: 'Run nself doctor --deep against prod target',
    status: 'pending',
  },
  {
    stage: 'deploy',
    label: 'Promote staging → prod',
    description: 'nself deploy --from staging --to prod',
    status: 'pending',
  },
  {
    stage: 'verify',
    label: 'Post-deploy verification',
    description: 'Hit /api/health on prod and validate 2xx',
    status: 'pending',
  },
  {
    stage: 'done',
    label: 'Record promotion',
    description: 'Log promotion event in audit trail',
    status: 'pending',
  },
]

// ---------------------------------------------------------------------------
// Confirm modal — requires typing PROMOTE TO PROD
// ---------------------------------------------------------------------------

function ConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  const [input, setInput] = useState('')
  const ok = input === 'PROMOTE TO PROD'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promote-title"
      onKeyDown={handleKeyDown}
    >
      <div className="glass-card mx-4 w-full max-w-md p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/15">
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2
              id="promote-title"
              className="text-nself-text text-base font-semibold"
            >
              Promote staging to production
            </h2>
            <p className="text-nself-text-muted mt-1 text-sm">
              This affects live infrastructure and users.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-xs font-medium text-red-300">
            Type{' '}
            <span className="rounded bg-red-500/20 px-1 font-mono">
              PROMOTE TO PROD
            </span>{' '}
            to confirm.
          </p>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type PROMOTE TO PROD"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          aria-label="Type PROMOTE TO PROD to continue"
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
            disabled={!ok}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Promote
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diff summary panel
// ---------------------------------------------------------------------------

function DiffSummary({ diff }: { diff: PromotionDiff }) {
  return (
    <div className="border-nself-border bg-nself-bg/40 space-y-2 rounded-lg border p-4">
      <p className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
        Diff Summary
      </p>
      <ul className="text-nself-text space-y-1 text-sm">
        <li>
          <span className="text-nself-text-muted">Files changed:</span>{' '}
          <span className="font-mono">{diff.filesChanged}</span>
        </li>
        <li>
          <span className="text-nself-text-muted">Services changed:</span>{' '}
          {diff.servicesChanged.length === 0 ? (
            <span className="text-nself-text-muted">none</span>
          ) : (
            <span className="font-mono">{diff.servicesChanged.join(', ')}</span>
          )}
        </li>
        <li>
          <span className="text-nself-text-muted">Env vars changed:</span>{' '}
          {diff.envChanged.length === 0 ? (
            <span className="text-nself-text-muted">none</span>
          ) : (
            <span className="font-mono">{diff.envChanged.join(', ')}</span>
          )}
        </li>
        <li>
          <span className="text-nself-text-muted">Images changed:</span>{' '}
          {diff.imagesChanged.length === 0 ? (
            <span className="text-nself-text-muted">none</span>
          ) : (
            <span className="font-mono">{diff.imagesChanged.join(', ')}</span>
          )}
        </li>
        {diff.lastStagingDeploy !== null && (
          <li>
            <span className="text-nself-text-muted">Last staging deploy:</span>{' '}
            <span>{new Date(diff.lastStagingDeploy).toLocaleString()}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step list
// ---------------------------------------------------------------------------

function StepRow({ step }: { step: PromotionStep }) {
  let icon: React.ReactNode
  let tone: string
  switch (step.status) {
    case 'done':
      icon = <CheckCircle2 className="h-4 w-4 text-green-400" />
      tone = 'text-nself-text'
      break
    case 'failed':
      icon = <AlertCircle className="h-4 w-4 text-red-400" />
      tone = 'text-red-300'
      break
    case 'running':
      icon = <Loader2 className="text-nself-primary h-4 w-4 animate-spin" />
      tone = 'text-nself-text'
      break
    case 'skipped':
      icon = <Clock className="text-nself-text-muted h-4 w-4" />
      tone = 'text-nself-text-muted'
      break
    default:
      icon = <Clock className="text-nself-text-muted h-4 w-4" />
      tone = 'text-nself-text-muted'
  }

  return (
    <li className="border-nself-border rounded-lg border px-3 py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`flex-1 text-sm ${tone}`}>{step.label}</span>
      </div>
      <p className="text-nself-text-muted mt-0.5 pl-6 text-xs">
        {step.description}
      </p>
      {step.detail !== undefined && (
        <p className="text-nself-text-muted mt-1 pl-6 font-mono text-xs">
          {step.detail}
        </p>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main promotion panel
// ---------------------------------------------------------------------------

export function PromotionPanel() {
  const [state, setState] = useState<PromotionState>({
    status: 'idle',
    steps: INITIAL_STEPS,
    diff: null,
    error: null,
  })
  const [showConfirm, setShowConfirm] = useState(false)

  const previewDiff = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'previewing',
      error: null,
      steps: INITIAL_STEPS.map((s) =>
        s.stage === 'diff' ? { ...s, status: 'running' } : s,
      ),
    }))

    try {
      const res = await fetch('/api/deploy/promotion/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'staging', to: 'prod' }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `Server error: ${res.status}`)
      }
      const diff = (await res.json()) as PromotionDiff
      setState((prev) => ({
        ...prev,
        status: 'ready',
        diff,
        steps: prev.steps.map((s) =>
          s.stage === 'diff' ? { ...s, status: 'done' } : s,
        ),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to compute diff.'
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: msg,
        steps: prev.steps.map((s) =>
          s.stage === 'diff' ? { ...s, status: 'failed', detail: msg } : s,
        ),
      }))
    }
  }, [])

  const executePromotion = useCallback(async () => {
    setShowConfirm(false)
    setState((prev) => ({
      ...prev,
      status: 'running',
      error: null,
      steps: prev.steps.map((s) =>
        s.stage === 'preflight' ? { ...s, status: 'running' } : s,
      ),
    }))

    try {
      const res = await fetch('/api/deploy/promotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'staging', to: 'prod' }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `Server error: ${res.status}`)
      }
      const body = (await res.json()) as { steps: PromotionStep[] }
      setState((prev) => ({
        ...prev,
        status: 'success',
        steps: body.steps,
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Promotion failed.'
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: msg,
      }))
    }
  }, [])

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          onConfirm={executePromotion}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="glass-card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="bg-nself-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <Rocket className="text-nself-primary h-5 w-5" />
          </div>
          <div>
            <h2 className="nself-gradient-text text-base font-semibold">
              Staging → Production Promotion
            </h2>
            <p className="text-nself-text-muted text-xs">
              Preview the diff, run preflight, then promote the current staging
              build to prod.
            </p>
          </div>
        </div>

        <div className="border-nself-border bg-nself-bg/40 flex items-center gap-3 rounded-lg border px-4 py-3">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            Staging
          </span>
          <ArrowRight className="text-nself-text-muted h-4 w-4" />
          <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
            Production
          </span>
        </div>

        {state.diff !== null && <DiffSummary diff={state.diff} />}

        <div>
          <p className="text-nself-text-muted mb-2 text-xs font-semibold tracking-widest uppercase">
            Steps
          </p>
          <ul className="space-y-1.5">
            {state.steps.map((step) => (
              <StepRow key={step.stage} step={step} />
            ))}
          </ul>
        </div>

        {state.error !== null && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-xs text-red-300">{state.error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={previewDiff}
            disabled={
              state.status === 'previewing' || state.status === 'running'
            }
            className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.status === 'previewing' ? 'Previewing…' : 'Preview Diff'}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={state.status !== 'ready'}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Promote to Production
          </button>
        </div>
      </div>
    </>
  )
}
