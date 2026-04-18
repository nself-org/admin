'use client'

import { EnvSwitcher } from '@/features/env-switcher/EnvSwitcher'
import type { EnvSwitchResult, EnvTarget } from '@/features/env-switcher/types'
import { GitBranch, Info, Key, Server } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface EnvDetail {
  name: EnvTarget
  host?: string
  port?: number
  sshKey?: string
  vaultPath?: string
}

const ENV_DETAIL_DEFAULTS: Record<EnvTarget, Omit<EnvDetail, 'name'>> = {
  local: {
    host: '127.0.0.1',
    port: 5432,
    vaultPath: 'vault/local',
  },
  staging: {
    host: 'staging.internal',
    port: 22,
    sshKey: '~/.ssh/nself_staging',
    vaultPath: 'vault/staging',
  },
  prod: {
    host: 'prod.internal',
    port: 22,
    sshKey: '~/.ssh/nself_prod',
    vaultPath: 'vault/prod',
  },
}

function EnvDetailCard({ env }: { env: EnvDetail }) {
  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> =
    []

  if (env.host) {
    rows.push({
      icon: <Server className="text-nself-text-muted h-3.5 w-3.5" />,
      label: 'Host',
      value: env.host,
    })
  }
  if (env.port !== undefined) {
    rows.push({
      icon: <GitBranch className="text-nself-text-muted h-3.5 w-3.5" />,
      label: 'Port',
      value: String(env.port),
    })
  }
  if (env.sshKey) {
    rows.push({
      icon: <Key className="text-nself-text-muted h-3.5 w-3.5" />,
      label: 'SSH Key',
      value: env.sshKey,
    })
  }
  if (env.vaultPath) {
    rows.push({
      icon: <Key className="text-nself-text-muted h-3.5 w-3.5" />,
      label: 'Vault Path',
      value: env.vaultPath,
    })
  }

  if (rows.length === 0) return null

  return (
    <div className="glass-card-elevated rounded-lg p-4">
      <h3 className="text-nself-text-muted mb-3 text-xs font-semibold tracking-widest uppercase">
        Credentials Reference
      </h3>
      <dl className="space-y-2">
        {rows.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            {icon}
            <dt className="text-nself-text-muted w-24 flex-shrink-0">
              {label}
            </dt>
            <dd className="text-nself-text font-mono text-xs">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function CLIReference() {
  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Info className="text-nself-primary h-4 w-4" />
        <h3 className="text-nself-text text-sm font-semibold">CLI Reference</h3>
      </div>
      <ul className="text-nself-text-muted space-y-1.5 font-mono text-xs">
        <li>
          <span className="text-nself-primary">nself env show</span>
          {' — '}show active environment
        </li>
        <li>
          <span className="text-nself-primary">nself env list</span>
          {' — '}list available environments
        </li>
        <li>
          <span className="text-nself-primary">nself env use local</span>
          {' — '}switch to local
        </li>
        <li>
          <span className="text-nself-primary">nself env use staging</span>
          {' — '}switch to staging
        </li>
        <li>
          <span className="text-nself-primary">nself env use prod</span>
          {' — '}switch to production
        </li>
        <li>
          <span className="text-nself-primary">
            nself env diff staging prod
          </span>
          {' — '}compare environments
        </li>
      </ul>
    </div>
  )
}

export default function EnvPage() {
  const [currentEnv, setCurrentEnv] = useState<EnvTarget>('local')
  const [switchHistory, setSwitchHistory] = useState<EnvSwitchResult[]>([])

  const handleSwitch = useCallback((result: EnvSwitchResult) => {
    setCurrentEnv(result.current)
    setSwitchHistory((prev) => [result, ...prev].slice(0, 5))
  }, [])

  // Derive detail from current env
  const [envDetail, setEnvDetail] = useState<EnvDetail>({
    name: 'local',
    ...ENV_DETAIL_DEFAULTS['local'],
  })

  useEffect(() => {
    setEnvDetail({
      name: currentEnv,
      ...ENV_DETAIL_DEFAULTS[currentEnv],
    })
  }, [currentEnv])

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="nself-gradient-text text-2xl font-bold">
          Environment Control
        </h1>
        <p className="text-nself-text-muted mt-1 text-sm">
          Select the active deployment target. All CLI commands run against the
          selected environment.
        </p>
      </div>

      {/* Switcher card */}
      <EnvSwitcher onSwitch={handleSwitch} />

      {/* Environment detail */}
      <EnvDetailCard env={envDetail} />

      {/* Switch history */}
      {switchHistory.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-nself-text-muted mb-3 text-xs font-semibold tracking-widest uppercase">
            Recent Switches
          </h3>
          <ul className="space-y-2">
            {switchHistory.map((r, i) => (
              <li
                key={i}
                className="text-nself-text-muted flex items-center gap-2 text-xs"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${r.success ? 'bg-green-400' : 'bg-red-400'}`}
                />
                <span>{r.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CLI reference */}
      <CLIReference />
    </div>
  )
}
