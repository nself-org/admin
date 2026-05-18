'use client'

/**
 * Pagination component - Page navigation with page numbers
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={2}
 *   totalPages={10}
 *   onPageChange={(page) => console.log(page)}
 * />
 * ```
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import * as React from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  maxPages?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxPages = 7,
  className,
}: PaginationProps) {
  const pages = React.useMemo(() => {
    const delta = Math.floor(maxPages / 2)
    let start = Math.max(1, currentPage - delta)
    let end = Math.min(totalPages, currentPage + delta)

    if (currentPage - delta < 1) {
      end = Math.min(totalPages, end + (delta - currentPage + 1))
    }

    if (currentPage + delta > totalPages) {
      start = Math.max(1, start - (currentPage + delta - totalPages))
    }

    const pageNumbers: (number | 'ellipsis')[] = []

    if (start > 1) {
      pageNumbers.push(1)
      if (start > 2) {
        pageNumbers.push('ellipsis')
      }
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i)
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pageNumbers.push('ellipsis')
      }
      pageNumbers.push(totalPages)
    }

    return pageNumbers
  }, [currentPage, totalPages, maxPages])

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Go to first page"
        >
          First
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <div key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center">
              <MoreHorizontal className="text-muted-foreground h-4 w-4" />
            </div>
          )
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            className="min-w-[2.25rem]"
          >
            {page}
          </Button>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
        >
          Last
        </Button>
      )}
    </nav>
  )
}

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  )
)
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />
)
PaginationItem.displayName = 'PaginationItem'

export { PaginationContent, PaginationItem }
