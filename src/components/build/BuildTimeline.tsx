'use client'

import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export type BuildStepStatus = 'pending' | 'in-progress' | 'complete' | 'failed'

export interface BuildStep {
  id: string
  name: string
  status: BuildStepStatus
  message?: string
  timestamp?: string
}

interface BuildTimelineProps {
  steps: BuildStep[]
  className?: string
}

export function BuildTimeline({ steps, className }: BuildTimelineProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="mt-0.5 flex-shrink-0">
            {step.status === 'complete' && (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            {step.status === 'failed' && (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {step.status === 'in-progress' && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            )}
            {step.status === 'pending' && (
              <div className="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
            )}
          </div>

          {/* Timeline Line */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                'absolute left-[10px] mt-7 ml-[1px] h-12 w-0.5',
                step.status === 'complete'
                  ? 'bg-green-600 dark:bg-green-400'
                  : 'bg-zinc-200 dark:bg-zinc-700',
              )}
            />
          )}

          {/* Step Content */}
          <div className="flex-1 pb-6">
            <div
              className={cn(
                'text-sm font-medium',
                step.status === 'complete' &&
                  'text-green-900 dark:text-green-200',
                step.status === 'failed' && 'text-red-900 dark:text-red-200',
                step.status === 'in-progress' &&
                  'text-blue-900 dark:text-blue-200',
                step.status === 'pending' && 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              {step.name}
            </div>
            {step.message && (
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {step.message}
              </div>
            )}
            {step.timestamp && step.status !== 'pending' && (
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                {new Date(step.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
