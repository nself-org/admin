'use client'

import { Cloud, Globe, MonitorSmartphone } from 'lucide-react'

export type Environment = 'local' | 'development' | 'staging' | 'production'

interface EnvironmentBadgeProps {
  environment: Environment
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function EnvironmentBadge({
  environment,
  showIcon = true,
  size = 'md',
}: EnvironmentBadgeProps) {
  const getEnvironmentConfig = (env: Environment) => {
    switch (env) {
      case 'local':
        return {
          label: 'Local',
          icon: MonitorSmartphone,
          bgColor: 'bg-green-100 dark:bg-green-950/30',
          textColor: 'text-green-700 dark:text-green-400',
          borderColor: 'border-green-300 dark:border-green-700',
          dotColor: 'bg-green-500',
        }
      case 'development':
        return {
          label: 'Development',
          icon: MonitorSmartphone,
          bgColor: 'bg-blue-100 dark:bg-blue-950/30',
          textColor: 'text-blue-700 dark:text-blue-400',
          borderColor: 'border-blue-300 dark:border-blue-700',
          dotColor: 'bg-blue-500',
        }
      case 'staging':
        return {
          label: 'Staging',
          icon: Cloud,
          bgColor: 'bg-yellow-100 dark:bg-yellow-950/30',
          textColor: 'text-yellow-700 dark:text-yellow-400',
          borderColor: 'border-yellow-300 dark:border-yellow-700',
          dotColor: 'bg-yellow-500',
        }
      case 'production':
        return {
          label: 'Production',
          icon: Globe,
          bgColor: 'bg-red-100 dark:bg-red-950/30',
          textColor: 'text-red-700 dark:text-red-400',
          borderColor: 'border-red-300 dark:border-red-700',
          dotColor: 'bg-red-500',
        }
      default:
        return {
          label: 'Unknown',
          icon: MonitorSmartphone,
          bgColor: 'bg-zinc-100 dark:bg-zinc-900',
          textColor: 'text-zinc-700 dark:text-zinc-400',
          borderColor: 'border-zinc-300 dark:border-zinc-700',
          dotColor: 'bg-zinc-500',
        }
    }
  }

  const config = getEnvironmentConfig(environment)
  const Icon = config.icon

  const sizeClasses = {
    sm: {
      padding: 'px-2 py-1',
      text: 'text-xs',
      icon: 'h-3 w-3',
      dot: 'h-1.5 w-1.5',
      gap: 'gap-1.5',
    },
    md: {
      padding: 'px-3 py-1.5',
      text: 'text-sm',
      icon: 'h-4 w-4',
      dot: 'h-2 w-2',
      gap: 'gap-2',
    },
    lg: {
      padding: 'px-4 py-2',
      text: 'text-base',
      icon: 'h-5 w-5',
      dot: 'h-2.5 w-2.5',
      gap: 'gap-2.5',
    },
  }

  const { padding, text, icon, dot, gap } = sizeClasses[size]

  return (
    <div
      className={`inline-flex items-center ${gap} rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${padding} font-medium`}
    >
      {showIcon && <Icon className={icon} />}
      <div className={`flex items-center ${gap}`}>
        <div className={`${dot} ${config.dotColor} animate-pulse rounded-full`} />
        <span className={text}>{config.label}</span>
      </div>
    </div>
  )
}

export function EnvironmentBadgeWithDetails({
  environment,
  version,
  uptime,
}: {
  environment: Environment
  version?: string
  uptime?: string
}) {
  const config = getEnvironmentConfig(environment)

  function getEnvironmentConfig(env: Environment) {
    switch (env) {
      case 'local':
        return {
          label: 'Local',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200 dark:border-green-900/30',
        }
      case 'development':
        return {
          label: 'Development',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-900/30',
        }
      case 'staging':
        return {
          label: 'Staging',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          borderColor: 'border-yellow-200 dark:border-yellow-900/30',
        }
      case 'production':
        return {
          label: 'Production',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-900/30',
        }
      default:
        return {
          label: 'Unknown',
          bgColor: 'bg-zinc-50 dark:bg-zinc-900',
          borderColor: 'border-zinc-200 dark:border-zinc-700',
        }
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Environment</h3>
        <EnvironmentBadge environment={environment} size="sm" />
      </div>

      {(version || uptime) && (
        <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          {version && (
            <div className="flex items-center justify-between">
              <span>Version:</span>
              <span className="font-medium text-zinc-900 dark:text-white">{version}</span>
            </div>
          )}
          {uptime && (
            <div className="flex items-center justify-between">
              <span>Uptime:</span>
              <span className="font-medium text-zinc-900 dark:text-white">{uptime}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
