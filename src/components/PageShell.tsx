'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface PageShellProps {
  title?: string
  description?: string
  children: ReactNode
  loading?: boolean
  error?: string | null
  actions?: ReactNode
}

/**
 * PageShell - Best practice component for instant page rendering
 *
 * PRINCIPLES:
 * 1. Renders immediately with title/description
 * 2. Shows loading skeleton for data areas
 * 3. Never blocks on data fetching
 * 4. Gracefully handles errors
 */
export function PageShell({
  title = 'Configuration',
  description,
  children,
  loading = false,
  error = null,
  actions,
}: PageShellProps) {
  return (
    <>
      <HeroPattern />

      <div className="mx-auto max-w-7xl">
        {/* Header - Always renders instantly */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">{title}</h1>
              {description && (
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>

        {/* Content Area */}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        ) : loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </>
  )
}

/**
 * DataSection - Wrapper for async data sections
 * Shows skeleton while loading, content when ready
 */
export function DataSection({
  loading,
  children,
  skeleton,
  className = '',
}: {
  loading: boolean
  children: ReactNode
  skeleton?: ReactNode
  className?: string
}) {
  if (loading) {
    return skeleton || <DefaultSkeleton className={className} />
  }

  return <div className={className}>{children}</div>
}

/**
 * Default skeleton loader
 */
function DefaultSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="mb-4 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700"></div>
      <div className="mb-4 h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700"></div>
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-700"></div>
    </div>
  )
}

/**
 * Card skeleton for grid layouts
 */
export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg bg-zinc-50 p-6 dark:bg-zinc-800/50">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-8 rounded bg-zinc-200 dark:bg-zinc-700"></div>
        <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700"></div>
      </div>
      <div className="mb-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700"></div>
      <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700"></div>
    </div>
  )
}
