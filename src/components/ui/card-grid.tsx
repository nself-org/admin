import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

/**
 * CardGrid - Responsive card grid (2/3/4 columns based on screen size)
 *
 * @example
 * ```tsx
 * <CardGrid columns={3}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </CardGrid>
 * ```
 */
export interface CardGridProps {
  /** Grid items */
  children: ReactNode
  /** Number of columns on desktop (default: 3) */
  columns?: 2 | 3 | 4
  /** Gap between items (default: 'md') */
  gap?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
}

export function CardGrid({ children, columns = 3, gap = 'md', className }: CardGridProps) {
  return (
    <div className={cn('grid grid-cols-1', columnClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  )
}
