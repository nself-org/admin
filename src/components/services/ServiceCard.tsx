'use client'

import * as Icons from '@/lib/icons'
import type { ContainerStats } from '@/services/collectors/DockerAPICollector'
import { useState } from 'react'

interface Container {
  id: string
  name: string
  image: string
  state: string
  status: string
  health?: 'healthy' | 'unhealthy' | 'starting' | 'stopped'
  ports?: { private: number; public: number; type: string }[]
  labels?: Record<string, string>
  created: number
  serviceType: string
  category: 'stack' | 'services'
  stats?: {
    cpu: { percentage: number; cores: number }
    memory: { usage: number; limit: number; percentage: number }
    network: { rx: number; tx: number }
    blockIO: { read: number; write: number }
    disk?: { used: number; total: number; percentage: number }
  }
  details?: {
    env: string[]
    mounts: any[]
    networkMode: string
    restartPolicy: any
    healthcheck: any
    labels: Record<string, string>
    command: string[]
  }
}

function getServiceUrl(container: Container): string | null {
  if (!container.ports || container.ports.length === 0) return null
  const primaryPort = container.ports.find((p) => p.public)
  if (!primaryPort) return null
  return `http://localhost:${primaryPort.public}`
}

// Get uptime string from created timestamp
function getUptimeString(created: number, state: string): string | null {
  if (state !== 'running') return null
  const now = Date.now() / 1000
  const uptimeSeconds = now - created
  const days = Math.floor(uptimeSeconds / 86400)
  const hours = Math.floor((uptimeSeconds % 86400) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function ServiceCard({
  container,
  onAction,
  getServiceIcon,
  getHealthColor,
  getHealthText,
}: {
  container: Container | ContainerStats | any
  onAction: (action: string, containerId: string) => void
  getServiceIcon: (name: string) => any
  getHealthColor: (health: string) => string
  getHealthText: (health: string) => string
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const displayName = container.name.replace(/^nself[-_]/, '').replace(/_/g, '-')
  const ServiceIcon = getServiceIcon(container.name)
  const healthColor = getHealthColor(container.health || 'stopped')
  const healthText = getHealthText(container.health || 'stopped')
  const serviceUrl = getServiceUrl(container)
  const primaryPort = container.ports?.find(
    (p: { private: number; public: number; type: string }) => p.public
  )
  const uptime = getUptimeString(container.created, container.state)

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 transition-all hover:ring-blue-400 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-blue-600">
      <div className="mb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
              <ServiceIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${healthColor}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  <span className="sr-only">Service status: </span>
                  {healthText}
                </span>
                {uptime && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Icons.Clock className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">Uptime: </span>
                    {uptime}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              aria-expanded={showDetails}
              aria-label={`${showDetails ? 'Hide' : 'Show'} details for ${displayName}`}
              className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              {showDetails ? (
                <Icons.ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Icons.ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-expanded={showMenu}
                aria-label={`Open menu for ${displayName}`}
                aria-haspopup="menu"
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <Icons.MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                    role="menu"
                    aria-label={`Actions for ${displayName}`}
                  >
                    <button
                      onClick={() => {
                        onAction('logs', container.id)
                        setShowMenu(false)
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      <Icons.FileText className="h-4 w-4" aria-hidden="true" />
                      View Logs
                    </button>
                    <button
                      onClick={() => {
                        onAction('inspect', container.id)
                        setShowMenu(false)
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      <Icons.Eye className="h-4 w-4" aria-hidden="true" />
                      Inspect
                    </button>
                    <button
                      onClick={() => {
                        onAction('terminal', container.id)
                        setShowMenu(false)
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      <Icons.Terminal className="h-4 w-4" aria-hidden="true" />
                      Terminal
                    </button>
                    <hr className="my-1 border-zinc-200 dark:border-zinc-700" aria-hidden="true" />
                    <button
                      onClick={() => {
                        onAction('remove', container.id)
                        setShowMenu(false)
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Icons.Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="truncate font-mono text-xs text-zinc-500" title={container.image}>
            {container.image.split(':')[0].split('/').pop()}:
            {container.image.split(':')[1] || 'latest'}
          </span>
        </div>
      </div>

      {/* Resource Usage */}
      {container.stats && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/50">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                <Icons.Cpu className="h-3 w-3" />
                CPU
              </span>
              <span className="text-[10px] font-semibold text-zinc-900 dark:text-white">
                {container.stats.cpu.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full transition-all duration-300 ${
                  container.stats.cpu.percentage > 80
                    ? 'bg-red-500'
                    : container.stats.cpu.percentage > 50
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(container.stats.cpu.percentage, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/50">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                <Icons.MemoryStick className="h-3 w-3" />
                Memory
              </span>
              <span className="text-[10px] font-semibold text-zinc-900 dark:text-white">
                {(container.stats.memory.usage / (1024 * 1024 * 1024)).toFixed(1)}
                GB
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full transition-all duration-300 ${
                  container.stats.memory.percentage > 80
                    ? 'bg-red-500'
                    : container.stats.memory.percentage > 50
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(container.stats.memory.percentage, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {serviceUrl ? (
            <a
              href={serviceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
              title={`Open ${serviceUrl}`}
            >
              <Icons.Globe className="h-3 w-3" />:{primaryPort?.public}
              <Icons.ExternalLink className="h-2.5 w-2.5" />
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              title="No public ports exposed"
            >
              <Icons.Lock className="h-3 w-3" />
              Internal
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {container.state === 'running' ? (
            <>
              <button
                onClick={() => onAction('restart', container.id)}
                aria-label={`Restart ${displayName}`}
                className="group rounded-md bg-zinc-50 p-1.5 transition-all hover:bg-yellow-50 dark:bg-zinc-800 dark:hover:bg-yellow-900/20"
                title="Restart service"
              >
                <Icons.RotateCw
                  className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-yellow-600 dark:text-zinc-400 dark:group-hover:text-yellow-400"
                  aria-hidden="true"
                />
              </button>
              <button
                onClick={() => onAction('stop', container.id)}
                aria-label={`Stop ${displayName}`}
                className="group rounded-md bg-zinc-50 p-1.5 transition-all hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-900/20"
                title="Stop service"
              >
                <Icons.Square
                  className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-red-600 dark:text-zinc-400 dark:group-hover:text-red-400"
                  aria-hidden="true"
                />
              </button>
            </>
          ) : (
            <button
              onClick={() => onAction('start', container.id)}
              aria-label={`Start ${displayName}`}
              className="group rounded-md bg-zinc-50 p-1.5 transition-all hover:bg-green-50 dark:bg-zinc-800 dark:hover:bg-green-900/20"
              title="Start service"
            >
              <Icons.Play
                className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-green-600 dark:text-zinc-400 dark:group-hover:text-green-400"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <div>
            <h4 className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Environment
            </h4>
            <div className="space-y-1">
              {container.details?.env?.slice(0, 3).map((env: string, i: number) => {
                const [key, value] = env.split('=')
                return (
                  <div key={i} className="font-mono text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">{key}=</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {value?.substring(0, 30)}
                      {(value?.length ?? 0) > 30 ? '...' : ''}
                    </span>
                  </div>
                )
              })}
              {container.details?.env && container.details.env.length > 3 && (
                <div className="text-xs text-zinc-500">
                  +{container.details.env.length - 3} more
                </div>
              )}
            </div>
          </div>

          {container.details?.mounts && container.details.mounts.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">Volumes</h4>
              <div className="space-y-1">
                {container.details.mounts.slice(0, 2).map((mount: any, i: number) => (
                  <div key={i} className="text-xs text-zinc-600 dark:text-zinc-400">
                    {mount.Source?.split('/').pop() || mount.Name} → {mount.Destination}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
