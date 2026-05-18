'use client'

/**
 * LoadingSpinner component - Loading indicator
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" />
 * <LoadingSpinner size="sm" className="text-blue-500" />
 * ```
 */

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={cn('text-muted-foreground animate-spin', sizeClasses[size], className)}
        aria-hidden="true"
      />
      <span className="sr-only">Loading{text ? `: ${text}` : '...'}</span>
      {text && (
        <p className="text-muted-foreground text-sm" aria-hidden="true">
          {text}
        </p>
      )}
    </div>
  )
}

/**
 * FullPageLoader - Centered loading spinner for full page loading states
 */
export function FullPageLoader({ text }: { text?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="main"
      aria-label="Loading content"
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

/**
 * InlineLoader - Inline loading spinner for button states
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <>
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </>
  )
}
