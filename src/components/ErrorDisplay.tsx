'use client'

/**
 * Error display component for showing user-friendly error messages
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/errors/ApiError'
import { getErrorMessage } from '@/lib/errors/utils'
import { AlertTriangle, Info, XCircle } from 'lucide-react'

export interface ErrorDisplayProps {
  error: unknown
  title?: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showDetails?: boolean
}

export function ErrorDisplay({
  error,
  title,
  onRetry,
  onDismiss,
  className,
  showDetails = false,
}: ErrorDisplayProps) {
  const apiError = error instanceof ApiError ? error : null
  const errorMessage = getErrorMessage(error)
  const userMessage = apiError?.userMessage || errorMessage
  const action = apiError?.action
  const retryable = apiError?.retryable ?? false

  // Determine severity based on error type
  const isWarning = apiError?.code && apiError.code >= 6000 && apiError.code < 7000
  const isInfo = apiError?.code && apiError.code === 9000 // Project not initialized

  return (
    <Alert variant={isWarning ? 'default' : 'destructive'} className={className}>
      <div className="flex items-start gap-2">
        {isInfo ? (
          <Info className="h-4 w-4" />
        ) : isWarning ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <div className="flex-1 space-y-2">
          {title && <AlertTitle>{title}</AlertTitle>}
          <AlertDescription className="space-y-2">
            <p>{userMessage}</p>
            {action && <p className="text-sm opacity-90">{action}</p>}
            {showDetails && apiError?.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                <pre className="mt-2 overflow-auto rounded bg-black/10 p-2 text-xs dark:bg-white/10">
                  {JSON.stringify(apiError.details, null, 2)}
                </pre>
              </details>
            )}
          </AlertDescription>
          {(retryable || onDismiss) && (
            <div className="flex gap-2 pt-2">
              {retryable && onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}
