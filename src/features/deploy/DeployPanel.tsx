'use client'

import type {
  ControlPlaneEnvironment,
  ControlPlaneInventory,
  ControlPlaneServer,
  ServerCapability,
} from '@/types/deployment'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Loader2,
  RefreshCw,
  Rocket,
  Server,
  SkipForward,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeployResult, DeployState, DeployStep, DeployStrategy } from './types'

// ---------------------------------------------------------------------------
// Strategy config (static — strategy choice doesn't come from CLI)
// ---------------------------------------------------------------------------

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
// Capability badge colours (mirrors environments page)
// ---------------------------------------------------------------------------

function capabilityColor(cap: ServerCapability): string {
  switch (cap) {
    case 'manage':
      return 'text-green-400 bg-green-500/10 border-green-500/30'
    case 'read-only':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    case 'hidden':
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'
  }
}

function capabilityLabel(cap: ServerCapability): string {
  switch (cap) {
    case 'manage':
      return 'Manage'
    case 'read-only':
      return 'Read-only'
    case 'hidden':
      return 'Hidden'
  }
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
      return <Loader2 className="text-nself-primary h-4 w-4 flex-shrink-0 animate-spin" />
    case 'skipped':
      return <SkipForward className="text-nself-text-muted h-4 w-4 flex-shrink-0" />
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
  environmentName: string
  serverName: string | null
  strategy: DeployStrategy
  dryRun: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ProdConfirmModal({
  environmentName,
  serverName,
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

  const isProd =
    environmentName.toLowerCase() === 'production' || environmentName.toLowerCase() === 'prod'

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
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              isProd ? 'bg-red-500/15' : 'bg-amber-500/15'
            }`}
          >
            <Rocket className={`h-5 w-5 ${isProd ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h2 id="deploy-prod-title" className="text-nself-text text-base font-semibold">
              Deploy to {environmentName}?
            </h2>
            <p className="text-nself-text-muted mt-1 text-sm">
              {serverName && (
                <span>
                  Server: <span className="text-nself-text font-mono">{serverName}</span>
                  {' · '}
                </span>
              )}
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

        <div
          className={`mb-4 rounded-lg border px-4 py-3 ${
            isProd ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <p className={`text-xs font-medium ${isProd ? 'text-red-300' : 'text-amber-300'}`}>
            Type{' '}
            <span
              className={`rounded px-1 font-mono ${isProd ? 'bg-red-500/20' : 'bg-amber-500/20'}`}
            >
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
          aria-label={`Type confirm to deploy to ${environmentName}`}
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
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isProd ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            Deploy to {environmentName}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inventory loading states
// ---------------------------------------------------------------------------

type InventoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'offline' }
  | { status: 'empty' }
  | {
      status: 'ready'
      inventory: ControlPlaneInventory
      environments: ControlPlaneEnvironment[]
    }

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DeployPanelProps {
  /** Called after a deploy completes (success or failure). */
  onComplete?: (result: DeployResult) => void
}

const INITIAL_DEPLOY_STATE: DeployState = {
  status: 'idle',
  target: null,
  strategy: null,
  steps: [],
  startedAt: null,
  duration: null,
  error: null,
  output: '',
}

/** Returns true when an environment name looks production-like (warn before deploy). */
function isProductionLike(name: string): boolean {
  const n = name.toLowerCase()
  return n === 'production' || n === 'prod'
}

/** Returns true when an environment name looks staging-like (warn before deploy). */
function requiresConfirmation(name: string): boolean {
  const n = name.toLowerCase()
  return n === 'production' || n === 'prod' || n === 'staging' || n === 'stage'
}

export function DeployPanel({ onComplete }: DeployPanelProps) {
  // Inventory state
  const [inventoryState, setInventoryState] = useState<InventoryState>({
    status: 'loading',
  })

  // Selected environment + server
  const [selectedEnvName, setSelectedEnvName] = useState<string | null>(null)
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null)

  // Deploy options
  const [strategy, setStrategy] = useState<DeployStrategy>('rolling')
  const [dryRun, setDryRun] = useState(false)

  // Deploy execution state
  const [deployState, setDeployState] = useState<DeployState>(INITIAL_DEPLOY_STATE)
  const [showConfirm, setShowConfirm] = useState(false)
  const outputRef = useRef<HTMLTextAreaElement>(null)

  const isRunning = deployState.status === 'running'

  // ---------------------------------------------------------------------------
  // Inventory fetch
  // ---------------------------------------------------------------------------

  const fetchInventory = useCallback(async () => {
    setInventoryState({ status: 'loading' })
    try {
      const res = await fetch('/api/control-plane?action=list', {
        cache: 'no-store',
      })

      if (res.status === 401 || res.status === 403) {
        // Handled upstream by layout redirect; show offline for robustness
        setInventoryState({
          status: 'error',
          message: 'Not authenticated. Please log in.',
        })
        return
      }

      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        data?: ControlPlaneInventory | ControlPlaneEnvironment[]
      }

      if (!res.ok || json.success === false) {
        const errMsg = json.error ?? `HTTP ${res.status}`
        const offline =
          errMsg.toLowerCase().includes('not found') ||
          errMsg.toLowerCase().includes('enoent') ||
          errMsg.toLowerCase().includes('not responding') ||
          res.status === 502
        if (offline) {
          setInventoryState({ status: 'offline' })
        } else {
          setInventoryState({ status: 'error', message: errMsg })
        }
        return
      }

      // Route wraps CLI output in { success, data } — unwrap and normalise
      const raw = json.data
      let envs: ControlPlaneEnvironment[] = []
      let inventory: ControlPlaneInventory = { environments: [] }
      if (raw && typeof raw === 'object' && 'environments' in raw) {
        inventory = raw as ControlPlaneInventory
        envs = inventory.environments ?? []
      } else if (Array.isArray(raw)) {
        envs = raw as ControlPlaneEnvironment[]
        inventory = { environments: envs }
      }

      if (envs.length === 0) {
        setInventoryState({ status: 'empty' })
        return
      }

      setInventoryState({ status: 'ready', inventory, environments: envs })

      // Auto-select first environment + first manageable server
      if (selectedEnvName === null) {
        const firstEnv = envs[0]
        setSelectedEnvName(firstEnv.name)
        const firstManageable = firstEnv.servers.find((s) => s.capability === 'manage')
        setSelectedServerName(firstManageable?.name ?? null)
      }
    } catch (_err) {
      setInventoryState({ status: 'offline' })
    }
  }, [selectedEnvName])

  useEffect(() => {
    void fetchInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Derived selection state
  // ---------------------------------------------------------------------------

  const selectedEnv: ControlPlaneEnvironment | null =
    inventoryState.status === 'ready'
      ? (inventoryState.environments.find((e) => e.name === selectedEnvName) ??
        inventoryState.environments[0] ??
        null)
      : null

  const visibleServers: ControlPlaneServer[] =
    selectedEnv?.servers.filter((s) => s.capability !== 'hidden') ?? []

  const multiServer = visibleServers.length > 1

  const selectedServer: ControlPlaneServer | null =
    visibleServers.find((s) => s.name === selectedServerName) ?? visibleServers[0] ?? null

  const canDeploy = selectedServer?.capability === 'manage'

  // ---------------------------------------------------------------------------
  // Deploy execution
  // ---------------------------------------------------------------------------

  const scrollOutputToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [])

  async function executeDeploy() {
    if (!selectedEnvName) return

    setDeployState({
      status: 'running',
      target: null,
      strategy,
      steps: [{ name: 'Initialising deploy…', status: 'running' }],
      startedAt: new Date().toISOString(),
      duration: null,
      error: null,
      output: '',
    })

    try {
      const body: Record<string, unknown> = {
        action: 'deploy',
        environment: selectedEnvName,
        options: {
          dryRun,
          rolling: strategy === 'rolling',
        },
      }
      if (selectedServerName) {
        ;(body.options as Record<string, unknown>).server = selectedServerName
      }

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as {
        success: boolean
        result?: DeployResult
        output?: string
        error?: string
        details?: string
        stderr?: string
      }

      if (data.success) {
        const result: DeployResult = data.result ?? {
          success: true,
          target: 'staging', // legacy compat field — actual target is selectedEnvName
          strategy,
          steps: [{ name: 'Deploy', status: 'done' }],
          duration: 0,
          output: data.output ?? '',
        }
        setDeployState((prev) => ({
          ...prev,
          status: 'success',
          steps: result.steps,
          duration: result.duration,
          output: data.output ?? result.output,
          error: null,
        }))
        onComplete?.(result)
      } else {
        const errMsg = data.details ?? data.error ?? 'Deploy failed'
        const syntheticResult: DeployResult = {
          success: false,
          target: 'staging',
          strategy,
          steps: [{ name: 'Deploy', status: 'failed', output: errMsg }],
          duration: 0,
          output: data.output ?? data.stderr ?? errMsg,
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
      const errMsg = err instanceof Error ? err.message : 'Network error — deploy request failed'
      const syntheticResult: DeployResult = {
        success: false,
        target: 'staging',
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
  // Deploy button handler — guard prod/staging with confirmation modal
  // ---------------------------------------------------------------------------

  function handleDeployClick() {
    if (!selectedEnvName) return
    if (requiresConfirmation(selectedEnvName)) {
      setShowConfirm(true)
      return
    }
    void executeDeploy()
  }

  function handleConfirm() {
    setShowConfirm(false)
    void executeDeploy()
  }

  function handleConfirmCancel() {
    setShowConfirm(false)
  }

  function handleReset() {
    setDeployState(INITIAL_DEPLOY_STATE)
  }

  // ---------------------------------------------------------------------------
  // Status banner
  // ---------------------------------------------------------------------------

  function renderStatusBanner() {
    if (deployState.status === 'idle') return null

    if (deployState.status === 'running') {
      return (
        <div className="border-nself-primary/30 bg-nself-primary/10 mb-4 flex items-center gap-2 rounded-lg border px-4 py-3">
          <Loader2 className="text-nself-primary h-4 w-4 animate-spin" />
          <span className="text-nself-text text-sm font-medium">
            Deploying to{' '}
            <span className="nself-gradient-text font-semibold">
              {selectedEnvName}
              {selectedServerName && (
                <span className="text-nself-text-muted font-mono"> ({selectedServerName})</span>
              )}
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

  // ---------------------------------------------------------------------------
  // Render — inventory loading states
  // ---------------------------------------------------------------------------

  function renderInventoryContent() {
    if (inventoryState.status === 'loading') {
      return (
        <div className="flex flex-col gap-3">
          {/* Skeleton environment selector */}
          <div className="mb-5">
            <div className="bg-nself-border/40 mb-2 h-3 w-24 animate-pulse rounded" />
            <div className="bg-nself-border/40 h-10 w-full animate-pulse rounded-lg" />
          </div>
          {/* Skeleton server selector */}
          <div className="mb-5">
            <div className="bg-nself-border/40 mb-2 h-3 w-20 animate-pulse rounded" />
            <div className="bg-nself-border/40 h-10 w-full animate-pulse rounded-lg" />
          </div>
        </div>
      )
    }

    if (inventoryState.status === 'offline') {
      return (
        <div className="rounded-lg border border-zinc-600/40 bg-zinc-800/30 px-4 py-6 text-center">
          <Server className="text-nself-text-muted mx-auto mb-2 h-8 w-8" />
          <p className="text-nself-text mb-1 text-sm font-medium">CLI not responding</p>
          <p className="text-nself-text-muted mb-3 text-xs">
            Make sure the nself CLI is installed and on PATH.
          </p>
          <button
            type="button"
            onClick={() => void fetchInventory()}
            className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )
    }

    if (inventoryState.status === 'error') {
      return (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">Failed to load environments</p>
              <p className="mt-0.5 text-xs text-red-300/70">{inventoryState.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchInventory()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-300 underline-offset-2 hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )
    }

    if (inventoryState.status === 'empty') {
      return (
        <div className="rounded-lg border border-zinc-600/40 bg-zinc-800/30 px-4 py-6 text-center">
          <Server className="text-nself-text-muted mx-auto mb-2 h-8 w-8" />
          <p className="text-nself-text mb-1 text-sm font-medium">No environments configured</p>
          <p className="text-nself-text-muted mb-3 text-xs">
            Add a server in{' '}
            <a href="/environments" className="text-nself-primary hover:underline">
              Environments
            </a>{' '}
            to enable deploys.
          </p>
        </div>
      )
    }

    // status === 'ready'
    const { environments } = inventoryState

    return (
      <>
        {/* Environment selector */}
        <div className="mb-5">
          <label
            htmlFor="deploy-env-select"
            className="text-nself-text-muted mb-2 block text-xs font-semibold tracking-widest uppercase"
          >
            Environment
          </label>
          <div className="relative">
            <select
              id="deploy-env-select"
              value={selectedEnvName ?? ''}
              onChange={(e) => {
                const name = e.target.value
                setSelectedEnvName(name)
                // Reset server selection when environment changes
                const env = environments.find((x) => x.name === name)
                const firstManageable = env?.servers.find((s) => s.capability === 'manage')
                setSelectedServerName(firstManageable?.name ?? null)
              }}
              disabled={isRunning}
              className="border-nself-border bg-nself-bg text-nself-text focus:border-nself-primary focus:ring-nself-primary w-full appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm focus:ring-1 focus:outline-none disabled:opacity-60"
            >
              {environments.map((env) => (
                <option key={env.name} value={env.name}>
                  {env.name}
                  {env.kind ? ` (${env.kind})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="text-nself-text-muted pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        {/* Server selector — only when >1 visible server */}
        {multiServer && (
          <div className="mb-5">
            <label
              htmlFor="deploy-server-select"
              className="text-nself-text-muted mb-2 block text-xs font-semibold tracking-widest uppercase"
            >
              Server
            </label>
            <div className="relative">
              <select
                id="deploy-server-select"
                value={selectedServerName ?? ''}
                onChange={(e) => setSelectedServerName(e.target.value)}
                disabled={isRunning}
                className="border-nself-border bg-nself-bg text-nself-text focus:border-nself-primary focus:ring-nself-primary w-full appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm focus:ring-1 focus:outline-none disabled:opacity-60"
              >
                {visibleServers.map((srv) => (
                  <option key={srv.name} value={srv.name} disabled={srv.capability !== 'manage'}>
                    {srv.name} ({srv.role})
                    {srv.capability !== 'manage' ? ` — ${capabilityLabel(srv.capability)}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="text-nself-text-muted pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* Capability warning when selected server is not manageable */}
        {selectedServer && selectedServer.capability !== 'manage' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-medium text-amber-300">
                Server is{' '}
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-xs ${capabilityColor(selectedServer.capability)}`}
                >
                  {capabilityLabel(selectedServer.capability)}
                </span>{' '}
                — deploys are disabled
              </p>
              {selectedServer.reason && selectedServer.reason.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {selectedServer.reason.map((r, i) => (
                    <li key={i} className="text-xs text-amber-300/70">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Partial access banner when environment has hidden servers */}
        {selectedEnv && selectedEnv.servers.some((s) => s.capability === 'hidden') && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-600/30 bg-zinc-700/20 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
            <p className="text-xs text-zinc-400">
              {selectedEnv.servers.filter((s) => s.capability === 'hidden').length} hidden server
              {selectedEnv.servers.filter((s) => s.capability === 'hidden').length > 1
                ? 's'
                : ''}{' '}
              not shown.{' '}
              <a href="/environments" className="text-nself-primary hover:underline">
                Manage in Environments
              </a>
            </p>
          </div>
        )}
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Full render
  // ---------------------------------------------------------------------------

  return (
    <>
      {showConfirm && selectedEnvName && (
        <ProdConfirmModal
          environmentName={selectedEnvName}
          serverName={selectedServerName}
          strategy={strategy}
          dryRun={dryRun}
          onConfirm={handleConfirm}
          onCancel={handleConfirmCancel}
        />
      )}

      <div className="glass-card p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-nself-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
              <Rocket className="text-nself-primary h-5 w-5" />
            </div>
            <div>
              <h2 className="nself-gradient-text text-base font-semibold">Deploy Pipeline</h2>
              <p className="text-nself-text-muted text-xs">Push your stack to any environment</p>
            </div>
          </div>
          {inventoryState.status === 'ready' && (
            <button
              type="button"
              onClick={() => void fetchInventory()}
              disabled={isRunning}
              title="Refresh environment list"
              className="text-nself-text-muted hover:text-nself-text rounded-md p-1 transition-colors disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status banner */}
        {renderStatusBanner()}

        {deployState.status === 'idle' && (
          <>
            {/* Inventory-driven environment + server selection */}
            {renderInventoryContent()}

            {/* Strategy selector — always shown when inventory is ready */}
            {inventoryState.status === 'ready' && (
              <>
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
                          disabled={isRunning}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition-all disabled:opacity-60 ${
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
                      disabled={isRunning}
                      className="border-nself-border accent-nself-primary h-4 w-4 rounded"
                    />
                    <span className="text-nself-text text-sm font-medium">Dry run</span>
                    <span className="text-nself-text-muted text-xs">
                      — validate without making changes
                    </span>
                  </label>
                </div>

                {/* Deploy button */}
                {canDeploy ? (
                  <button
                    type="button"
                    onClick={handleDeployClick}
                    disabled={isRunning}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isProductionLike(selectedEnvName ?? '')
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'nself-btn-primary'
                    }`}
                  >
                    <Rocket className="h-4 w-4" />
                    {dryRun ? 'Dry Run' : 'Deploy'} to {selectedEnvName}
                    {selectedServerName && multiServer && (
                      <span className="font-mono text-xs opacity-70">({selectedServerName})</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-zinc-600/40 bg-zinc-700/20 px-4 py-2.5 text-sm font-semibold text-zinc-500"
                  >
                    <Rocket className="h-4 w-4" />
                    Deploy unavailable — server not manageable
                  </button>
                )}
              </>
            )}
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
