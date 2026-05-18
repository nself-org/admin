'use client'

import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  RotateCw,
  Square,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'

export interface ServiceCardData {
  name: string
  displayName: string
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'unhealthy' | 'error'
  health?: 'healthy' | 'unhealthy' | 'pending'
  cpu?: number
  memory?: number
  uptime?: string
  port?: string
  containerId?: string
}

interface ServiceCardProps {
  service: ServiceCardData
  onStart?: (name: string) => void
  onStop?: (name: string) => void
  onRestart?: (name: string) => void
  onViewLogs?: (name: string) => void
  onViewDetails?: (name: string) => void
  isLoading?: boolean
}

export function ServiceCard({
  service,
  onStart,
  onStop,
  onRestart,
  onViewLogs,
  onViewDetails,
  isLoading = false,
}: ServiceCardProps) {
  const [expanded, setExpanded] = useState(false)

  const getStatusColor = () => {
    if (service.health === 'unhealthy' || service.status === 'error') {
      return 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'
    }
    if (service.status === 'running' && (service.health === 'healthy' || !service.health)) {
      return 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
    }
    if (service.status === 'starting' || service.status === 'stopping') {
      return 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
    }
    return 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900/50'
  }

  const getStatusIcon = () => {
    if (service.status === 'starting' || service.status === 'stopping') {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </motion.div>
      )
    }
    if (service.health === 'unhealthy' || service.status === 'error') {
      return (
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </motion.div>
      )
    }
    if (service.status === 'running' && (service.health === 'healthy' || !service.health)) {
      return (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-2 w-2 rounded-full bg-green-500" />
        </motion.div>
      )
    }
    if (service.status === 'stopped') {
      return <div className="h-2 w-2 rounded-full bg-zinc-400" />
    }
    return <div className="h-2 w-2 rounded-full bg-zinc-400" />
  }

  const getStatusText = () => {
    if (service.health === 'unhealthy') return 'Unhealthy'
    if (service.status === 'error') return 'Error'
    if (service.status === 'starting') return 'Starting...'
    if (service.status === 'stopping') return 'Stopping...'
    if (service.status === 'running') return 'Running'
    if (service.status === 'stopped') return 'Stopped'
    return 'Unknown'
  }

  const canStart = service.status === 'stopped'
  const canStop =
    service.status === 'running' || service.status === 'unhealthy' || service.status === 'error'
  const canRestart =
    service.status === 'running' || service.status === 'unhealthy' || service.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border-2 p-4 transition-all ${getStatusColor()}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden="true">{getStatusIcon()}</span>
            <h3 className="font-semibold text-zinc-900 dark:text-white">{service.displayName}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="capitalize">
              <span className="sr-only">Service status: </span>
              {getStatusText()}
            </span>
            {service.uptime && (
              <>
                <span aria-hidden="true">•</span>
                <span>
                  <span className="sr-only">Uptime: </span>
                  {service.uptime}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1">
          {canStart && onStart && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStart(service.name)}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              aria-label={`Start ${service.displayName}`}
              title="Start service"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {canStop && onStop && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStop(service.name)}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              aria-label={`Stop ${service.displayName}`}
              title="Stop service"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {canRestart && onRestart && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRestart(service.name)}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              aria-label={`Restart ${service.displayName}`}
              title="Restart service"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Resource Usage */}
      {(service.cpu !== undefined || service.memory !== undefined) && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {service.cpu !== undefined && (
            <div className="rounded bg-white/50 p-2 dark:bg-zinc-800/50">
              <div className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">CPU</div>
              <div className="font-semibold text-zinc-900 dark:text-white">
                {service.cpu.toFixed(1)}%
              </div>
            </div>
          )}
          {service.memory !== undefined && (
            <div className="rounded bg-white/50 p-2 dark:bg-zinc-800/50">
              <div className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">Memory</div>
              <div className="font-semibold text-zinc-900 dark:text-white">
                {service.memory.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} quick actions for ${service.displayName}`}
        className="mb-2 flex w-full items-center justify-between rounded p-2 text-xs text-zinc-600 transition-colors hover:bg-white/50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
      >
        <span>Quick Actions</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        )}
      </button>

      {/* Expanded Actions */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-1">
          {onViewLogs && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewLogs(service.name)}
              className="justify-start"
            >
              <Terminal className="mr-2 h-4 w-4" />
              View Logs
            </Button>
          )}
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(service.name)}
              className="justify-start"
            >
              <Activity className="mr-2 h-4 w-4" />
              View Details
            </Button>
          )}
          {service.port && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`http://localhost:${service.port}`, '_blank')}
              className="justify-start"
            >
              <Pause className="mr-2 h-4 w-4" />
              Open Port {service.port}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Port Badge */}
      {service.port && !expanded && (
        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Port: {service.port}</div>
      )}
    </motion.div>
  )
}
