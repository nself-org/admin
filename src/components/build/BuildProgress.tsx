'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface BuildProgressProps {
  progress: number // 0-100
  currentStep: number
  totalSteps: number
  elapsedTime: number // seconds
  status: 'building' | 'success' | 'error'
  className?: string
}

export function BuildProgress({
  progress,
  currentStep,
  totalSteps,
  elapsedTime,
  status,
  className,
}: BuildProgressProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      <div className="relative">
        <Progress
          value={progress}
          className={cn(
            'h-3',
            status === 'success' && 'bg-green-100 dark:bg-green-900/20',
            status === 'error' && 'bg-red-100 dark:bg-red-900/20',
          )}
        />
        <div
          className={cn(
            'absolute inset-0 h-3 rounded-full transition-all duration-500',
            status === 'building' && 'bg-blue-600 dark:bg-blue-400',
            status === 'success' && 'bg-green-600 dark:bg-green-400',
            status === 'error' && 'bg-red-600 dark:bg-red-400',
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {/* Step Counter */}
          <div className="text-zinc-600 dark:text-zinc-400">
            {status === 'success' ? (
              <span className="font-medium text-green-600 dark:text-green-400">
                Complete
              </span>
            ) : status === 'error' ? (
              <span className="font-medium text-red-600 dark:text-red-400">
                Failed at step {currentStep}
              </span>
            ) : (
              <span>
                Step <span className="font-medium">{currentStep}</span> of{' '}
                <span className="font-medium">{totalSteps}</span>
              </span>
            )}
          </div>

          {/* Progress Percentage */}
          <div className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="text-zinc-600 dark:text-zinc-400">
          Elapsed:{' '}
          <span className="font-medium">{formatTime(elapsedTime)}</span>
        </div>
      </div>
    </div>
  )
}
