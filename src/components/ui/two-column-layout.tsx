import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

/**
 * TwoColumnLayout - Sidebar + content layout (responsive)
 *
 * @example
 * ```tsx
 * <TwoColumnLayout
 *   sidebar={
 *     <nav>
 *       <a href="/settings">Settings</a>
 *       <a href="/profile">Profile</a>
 *     </nav>
 *   }
 * >
 *   <Card>Main content here</Card>
 * </TwoColumnLayout>
 * ```
 */
export interface TwoColumnLayoutProps {
  /** Sidebar content (left column on desktop) */
  sidebar: ReactNode
  /** Main content (right column on desktop) */
  children: ReactNode
  /** Sidebar width on desktop (default: 256px / w-64) */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Reverse order on mobile (sidebar below content) */
  reverseMobile?: boolean
  /** Additional CSS classes */
  className?: string
}

const sidebarWidths = {
  sm: 'lg:w-48',
  md: 'lg:w-64',
  lg: 'lg:w-80',
}

export function TwoColumnLayout({
  sidebar,
  children,
  sidebarWidth = 'md',
  reverseMobile = false,
  className,
}: TwoColumnLayoutProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        reverseMobile
          ? 'grid-cols-1 lg:grid-cols-[1fr,auto]'
          : 'grid-cols-1 lg:grid-cols-[auto,1fr]',
        className
      )}
    >
      {/* Sidebar */}
      <aside
        className={cn('w-full', sidebarWidths[sidebarWidth], reverseMobile && 'lg:order-2')}
        role="complementary"
        aria-label="Sidebar"
      >
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className={cn('min-w-0', reverseMobile && 'lg:order-1')}>{children}</main>
    </div>
  )
}
