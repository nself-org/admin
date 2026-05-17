'use client'

import { HeroPattern } from '@/components/HeroPattern'
import type {
  ControlPlaneEnvironment,
  ControlPlaneServer,
  ServerCapability,
} from '@/types/deployment'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  EyeOff,
  Lock,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  WifiOff,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// ── Capability badge ──────────────────────────────────────────────────────────

function CapabilityBadge({ capability }: { capability: ServerCapability }) {
  switch (capability) {
    case 'manage':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          manage
        </span>
      )
    case 'read-only':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Lock className="h-3 w-3" />
          read-only
        </span>
      )
    case 'hidden':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
          <EyeOff className="h-3 w-3" />
          hidden
        </span>
      )
  }
}

// ── Server status panel ───────────────────────────────────────────────────────

interface ServerStatusPanelProps {
  server: ControlPlaneServer
  envName: string
  onDeploy: (serverName: string) => void
  deploying: boolean
}

function ServerStatusPanel({
  server,
  envName,
  onDeploy,
  deploying,
}: ServerStatusPanelProps) {
  const canDeploy = server.capability === 'manage'

  return (
    <div
      className={`rounded-xl border p-5 ${
        server.capability === 'manage'
          ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
          : 'border-amber-200 bg-amber-50/30 dark:border-amber-800/50 dark:bg-amber-900/10'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-white">
              {server.name}
            </span>
            {server.primary && (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                primary
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {server.host} · {server.role}
          </p>
        </div>
        <CapabilityBadge capability={server.capability} />
      </div>

      {/* Resolver reasons */}
      {server.reason && server.reason.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <p className="mb-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            Access limitations:
          </p>
          <ul className="space-y-0.5">
            {server.reason.map((r) => (
              <li key={r} className="text-xs text-amber-700 dark:text-amber-400">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deploy button — only for manage-capable servers */}
      <div className="flex items-center gap-2">
        <button
          disabled={!canDeploy || deploying}
          onClick={() => onDeploy(server.name)}
          title={
            !canDeploy
              ? `Cannot deploy — server is ${server.capability}`
              : `Deploy to ${server.name}`
          }
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            canDeploy
              ? 'bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50'
              : 'cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
          }`}
        >
          {deploying ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Deploy
        </button>
        {!canDeploy && (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {server.capability === 'read-only'
              ? 'No SSH access — read-only'
              : 'Server hidden — check config'}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Server switcher ───────────────────────────────────────────────────────────

interface ServerSwitcherProps {
  servers: ControlPlaneServer[]
  selected: string | null
  onSelect: (name: string) => void
}

function ServerSwitcher({ servers, selected, onSelect }: ServerSwitcherProps) {
  const [open, setOpen] = useState(false)
  const current = servers.find((s) => s.name === selected) ?? servers[0]

  if (servers.length <= 1) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Server className="h-4 w-4" />
        {current?.name ?? 'All servers'}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {servers.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                onSelect(s.name)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <span>{s.name}</span>
              <CapabilityBadge capability={s.capability} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Deploy status panel ───────────────────────────────────────────────────────

interface DeployStatus {
  success: boolean
  status?: string
  output?: string
  stderr?: string
}

// ── Main page ─────────────────────────────────────────────────────────────────

function getEnvGradient(name: string): string {
  switch (name.toLowerCase()) {
    case 'local':
    case 'development':
      return 'from-blue-600 to-cyan-400 dark:from-blue-400 dark:to-cyan-300'
    case 'staging':
      return 'from-yellow-600 to-orange-400 dark:from-yellow-400 dark:to-orange-300'
    case 'production':
    case 'prod':
      return 'from-red-600 to-pink-400 dark:from-red-400 dark:to-pink-300'
    default:
      return 'from-sky-500 to-blue-400 dark:from-sky-400 dark:to-blue-300'
  }
}

export default function EnvironmentDetailPage() {
  const params = useParams()
  const envName = params.name as string

  const [loading, setLoading] = useState(true)
  const [environment, setEnvironment] = useState<ControlPlaneEnvironment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [deployingServer, setDeployingServer] = useState<string | null>(null)
  const [deployResult, setDeployResult] = useState<DeployStatus | null>(null)

  const [deployStatus, setDeployStatus] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Fetch environment detail via probe (capability-aware)
  const fetchEnvironment = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)

    try {
      const res = await fetch(
        `/api/control-plane?action=probe&env=${encodeURIComponent(envName)}`,
      )
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (!res.ok || !data.success) {
        if (res.status === 502 || (data.error && data.error.includes('non-JSON'))) {
          setOffline(true)
        } else {
          setError(data.error ?? 'Failed to load environment')
        }
        return
      }

      // data.data is the full inventory — find our environment
      const raw = data.data
      let envData: ControlPlaneEnvironment | null = null

      if (raw && typeof raw === 'object' && 'environments' in raw) {
        const inv = raw as { environments: ControlPlaneEnvironment[] }
        envData = inv.environments.find((e) => e.name === envName) ?? null
      } else if (Array.isArray(raw)) {
        envData = (raw as ControlPlaneEnvironment[]).find(
          (e) => e.name === envName,
        ) ?? null
      }

      if (!envData) {
        // Not found in probe — fall back to list
        const listRes = await fetch('/api/control-plane?action=list')
        const listData = await listRes.json()
        if (listRes.ok && listData.success && listData.data) {
          const ld = listData.data
          if (ld && typeof ld === 'object' && 'environments' in ld) {
            envData =
              (ld as { environments: ControlPlaneEnvironment[] }).environments.find(
                (e) => e.name === envName,
              ) ?? null
          }
        }
      }

      setEnvironment(envData)
      if (envData && envData.servers.length > 0) {
        const primary = envData.servers.find((s) => s.primary)
        setSelectedServer(primary?.name ?? envData.servers[0].name)
      }
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [envName])

  // Fetch deploy status for this environment
  const fetchDeployStatus = useCallback(async () => {
    setCheckingStatus(true)
    try {
      const res = await fetch(
        `/api/deploy?environment=${encodeURIComponent(envName)}`,
      )
      const data = await res.json()
      setDeployStatus(data.status ?? null)
    } catch {
      // Status is best-effort
    } finally {
      setCheckingStatus(false)
    }
  }, [envName])

  useEffect(() => {
    fetchEnvironment()
    fetchDeployStatus()
  }, [fetchEnvironment, fetchDeployStatus])

  // Deploy to a specific server
  async function handleDeploy(serverName: string) {
    setDeployingServer(serverName)
    setDeployResult(null)
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy',
          environment: envName,
          options: { server: serverName },
        }),
      })
      const data = await res.json()
      setDeployResult({
        success: res.ok && data.success,
        status: data.success ? 'Deploy triggered' : undefined,
        output: data.output,
        stderr: data.stderr,
      })
      if (res.ok && data.success) {
        await fetchDeployStatus()
      }
    } catch {
      setDeployResult({ success: false, output: 'Network error — could not reach API' })
    } finally {
      setDeployingServer(null)
    }
  }

  // ── Offline ────────────────────────────────────────────────────────────────
  if (offline) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <BackLink />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-20 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <WifiOff className="mb-4 h-12 w-12 text-zinc-400" />
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              nself is not responding
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Make sure <code className="font-mono">nself</code> is installed and
              your project is configured.
            </p>
            <button
              onClick={() => fetchEnvironment()}
              className="mt-6 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <BackLink />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
              />
            ))}
          </div>
        </div>
      </>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <BackLink />
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button
                onClick={() => fetchEnvironment()}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Empty / not found ──────────────────────────────────────────────────────
  if (!environment) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <BackLink />
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white py-20 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <Server className="mb-4 h-12 w-12 text-zinc-400" />
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              Environment &quot;{envName}&quot; not found
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This environment is not in your inventory. Add a server to create
              it.
            </p>
            <Link
              href="/environments"
              className="mt-6 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Environments
            </Link>
          </div>
        </div>
      </>
    )
  }

  const visibleServers = environment.servers.filter(
    (s) => s.capability !== 'hidden',
  )
  const hasPartialAccess = environment.servers.some(
    (s) => s.capability === 'read-only' || s.capability === 'hidden',
  )
  const limitedServers = environment.servers.filter(
    (s) => s.capability === 'read-only' || s.capability === 'hidden',
  )

  // ── Success ────────────────────────────────────────────────────────────────
  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <BackLink />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r ${getEnvGradient(envName)}`}
              >
                <Server className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold capitalize text-zinc-900 dark:text-white">
                  {envName}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {environment.kind} · {environment.servers.length} server
                  {environment.servers.length !== 1 ? 's' : ''}
                  {deployStatus ? ` · ${deployStatus}` : ''}
                  {checkingStatus && (
                    <RefreshCw className="ml-1 inline h-3 w-3 animate-spin" />
                  )}
                </p>
              </div>
            </div>

            {/* Multi-server switcher */}
            <ServerSwitcher
              servers={visibleServers}
              selected={selectedServer}
              onSelect={setSelectedServer}
            />
          </div>
        </div>

        {/* Partial access banner */}
        {hasPartialAccess && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Partial access — {limitedServers.length} server
                  {limitedServers.length > 1 ? 's' : ''} with limited capability
                </p>
                <ul className="mt-1 space-y-0.5">
                  {limitedServers.map((s) => (
                    <li
                      key={s.name}
                      className="text-xs text-amber-700 dark:text-amber-400"
                    >
                      · <strong>{s.name}</strong> ({s.capability})
                      {s.reason && s.reason[0] ? `: ${s.reason[0]}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Deploy result */}
        {deployResult && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              deployResult.success
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {deployResult.success ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {deployResult.success
                    ? 'Deploy triggered successfully'
                    : 'Deploy failed'}
                </p>
                {deployResult.output && (
                  <pre className="mt-2 overflow-x-auto rounded bg-black/10 p-2 text-xs dark:bg-black/30">
                    {deployResult.output.slice(0, 500)}
                  </pre>
                )}
                {deployResult.stderr && (
                  <pre className="mt-1 overflow-x-auto rounded bg-black/10 p-2 text-xs text-red-600 dark:bg-black/30 dark:text-red-400">
                    {deployResult.stderr.slice(0, 300)}
                  </pre>
                )}
              </div>
              <button
                onClick={() => setDeployResult(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Server panels */}
        <div className="grid gap-4 md:grid-cols-2">
          {visibleServers.map((server) => (
            <ServerStatusPanel
              key={server.name}
              server={server}
              envName={envName}
              onDeploy={handleDeploy}
              deploying={deployingServer === server.name}
            />
          ))}

          {visibleServers.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
              <EyeOff className="mb-3 h-10 w-10 text-zinc-400" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                All servers are hidden — no access configured
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Run{' '}
                <code className="font-mono">
                  nself env target add --host ... --role ...
                </code>{' '}
                to add a server
              </p>
            </div>
          )}
        </div>

        {/* CLI reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
            CLI Commands
          </h3>
          <div className="space-y-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              <span className="text-sky-500">nself env target probe</span> —
              probe server capabilities
            </p>
            <p>
              <span className="text-sky-500">
                nself deploy {envName} --server &lt;name&gt;
              </span>{' '}
              — deploy to specific server
            </p>
            <p>
              <span className="text-sky-500">
                nself deploy health {envName}
              </span>{' '}
              — check health
            </p>
            <p>
              <span className="text-sky-500">
                nself deploy logs {envName}
              </span>{' '}
              — view logs
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Shared back link ──────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link
      href="/environments"
      className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Environments
    </Link>
  )
}
