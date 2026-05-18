'use client'

import { motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useState } from 'react'

export interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  timestamp?: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

interface AlertsProps {
  alerts: Alert[]
  onDismiss?: (id: string) => void
}

export function Alerts({ alerts, onDismiss }: AlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const handleDismiss = (id: string) => {
    setDismissed(new Set([...dismissed, id]))
    onDismiss?.(id)
  }

  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-900/50',
          textColor: 'text-red-900 dark:text-red-200',
          iconColor: 'text-red-600 dark:text-red-400',
          accentColor: 'bg-red-600 dark:bg-red-500',
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
          borderColor: 'border-yellow-200 dark:border-yellow-900/50',
          textColor: 'text-yellow-900 dark:text-yellow-200',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          accentColor: 'bg-yellow-600 dark:bg-yellow-500',
        }
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-900/50',
          textColor: 'text-blue-900 dark:text-blue-200',
          iconColor: 'text-blue-600 dark:text-blue-400',
          accentColor: 'bg-blue-600 dark:bg-blue-500',
        }
    }
  }

  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id))
  const criticalCount = visibleAlerts.filter((a) => a.type === 'critical').length
  const warningCount = visibleAlerts.filter((a) => a.type === 'warning').length

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <div
      className="space-y-3"
      role="region"
      aria-label="System alerts"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Summary Banner (only show if multiple alerts) */}
      {visibleAlerts.length > 1 && (criticalCount > 0 || warningCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border-2 border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
        >
          <div className="flex items-center gap-4">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-red-900 dark:text-red-200">
                  {criticalCount} Critical
                </span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-950/50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  {warningCount} Warning{warningCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Individual Alerts */}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const config = getAlertConfig(alert.type)
          const Icon = config.icon

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              role={alert.type === 'critical' ? 'alert' : 'status'}
              className={`relative overflow-hidden rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              {/* Accent bar */}
              <div
                className={`absolute top-0 left-0 h-full w-1 ${config.accentColor}`}
                aria-hidden="true"
              />

              <div className="flex items-start gap-3 p-4 pl-5">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-sm font-semibold ${config.textColor}`}>{alert.title}</h4>
                      <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>
                        {alert.message}
                      </p>

                      {/* Action Button */}
                      {alert.action && (
                        <button
                          onClick={alert.action.onClick}
                          className={`mt-3 rounded px-3 py-1 text-xs font-medium transition-colors ${config.accentColor} text-white hover:opacity-90`}
                        >
                          {alert.action.label}
                        </button>
                      )}
                    </div>

                    {/* Dismiss Button */}
                    {alert.dismissible !== false && (
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className={`flex-shrink-0 rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${config.iconColor}`}
                        aria-label={`Dismiss ${alert.type} alert: ${alert.title}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  {alert.timestamp && <p className="mt-2 text-xs opacity-60">{alert.timestamp}</p>}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
