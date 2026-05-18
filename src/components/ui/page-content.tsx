import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

/**
 * PageContent - Content area with proper spacing and optional padding
 *
 * @example
 * ```tsx
 * <PageContent>
 *   <Card>Content here</Card>
 * </PageContent>
 *
 * <PageContent noPadding>
 *   <Table>...</Table>
 * </PageContent>
 * ```
 */
export interface PageContentProps {
  /** Content to render */
  children: ReactNode
  /** Remove default padding (useful for full-width tables, etc) */
  noPadding?: boolean
  /** Additional CSS classes */
  className?: string
}

export function PageContent({ children, noPadding = false, className }: PageContentProps) {
  return <div className={cn('w-full', !noPadding && 'space-y-6', className)}>{children}</div>
}
