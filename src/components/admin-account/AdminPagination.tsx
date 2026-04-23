'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AdminPaginationProps {
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  label?: string
}

export function AdminPagination({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  label = 'events',
}: AdminPaginationProps) {
  return (
    <div
      role="navigation"
      aria-label={`${label} pagination`}
      className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-700"
    >
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label={`Previous page of ${label}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>

      <button
        onClick={onNext}
        disabled={!hasNext}
        aria-label={`Next page of ${label}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
