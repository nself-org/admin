import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

/**
 * ThreeColumnLayout - Sidebar + content + sidebar layout (responsive)
 *
 * Collapses to single column on mobile, two columns on tablet, three on desktop
 *
 * @example
 * ```tsx
 * <ThreeColumnLayout
 *   leftSidebar={<Navigation />}
 *   rightSidebar={<TableOfContents />}
 * >
 *   <Article />
 * </ThreeColumnLayout>
 * ```
 */
export interface ThreeColumnLayoutProps {
  /** Left sidebar content */
  leftSidebar?: ReactNode
  /** Main content (center column) */
  children: ReactNode
  /** Right sidebar content */
  rightSidebar?: ReactNode
  /** Left sidebar width on desktop */
  leftSidebarWidth?: 'sm' | 'md' | 'lg'
  /** Right sidebar width on desktop */
  rightSidebarWidth?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sidebarWidths = {
  sm: 'w-48',
  md: 'w-64',
  lg: 'w-80',
}

export function ThreeColumnLayout({
  leftSidebar,
  children,
  rightSidebar,
  leftSidebarWidth = 'md',
  rightSidebarWidth = 'sm',
  className,
}: ThreeColumnLayoutProps) {
  const hasLeftSidebar = Boolean(leftSidebar)
  const hasRightSidebar = Boolean(rightSidebar)

  return (
    <div
      className={cn(
        'grid gap-6',
        // Mobile: single column
        'grid-cols-1',
        // Desktop: three columns with auto-sized sidebars and fluid center
        hasLeftSidebar && hasRightSidebar && 'xl:grid-cols-[auto,1fr,auto]',
        hasLeftSidebar && !hasRightSidebar && 'xl:grid-cols-[auto,1fr]',
        !hasLeftSidebar && hasRightSidebar && 'xl:grid-cols-[1fr,auto]',
        className
      )}
    >
      {/* Left Sidebar */}
      {hasLeftSidebar && (
        <aside
          className={cn('w-full', sidebarWidths[leftSidebarWidth], 'order-1')}
          role="complementary"
          aria-label="Left sidebar"
        >
          {leftSidebar}
        </aside>
      )}

      {/* Main Content */}
      <main className={cn('min-w-0', hasLeftSidebar ? 'order-2' : 'order-1')}>{children}</main>

      {/* Right Sidebar */}
      {hasRightSidebar && (
        <aside
          className={cn('w-full', sidebarWidths[rightSidebarWidth], 'order-3')}
          role="complementary"
          aria-label="Right sidebar"
        >
          {rightSidebar}
        </aside>
      )}
    </div>
  )
}
