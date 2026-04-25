import { CopyLinkButton } from '@/components/ui/copy-link-button'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

/**
 * PageHeader - Component for page title, breadcrumbs, and actions.
 *
 * Includes a CopyLinkButton by default so every admin page is deep-linkable.
 * Set `showCopyLink={false}` to suppress it on pages where it's not useful
 * (e.g. modal-only pages, login, build wizard).
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Database Settings"
 *   description="Manage your database configuration"
 *   breadcrumbs={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Database', href: '/database' },
 *     { label: 'Settings' }
 *   ]}
 *   actions={
 *     <Button>Save Changes</Button>
 *   }
 * />
 * ```
 */
export interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional description text below title */
  description?: string
  /** Optional breadcrumb navigation */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Optional action buttons in the top right */
  actions?: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Show copy-link button (default: true) */
  showCopyLink?: boolean
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  showCopyLink = true,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800',
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="mb-2 flex items-center space-x-1 text-sm text-zinc-500 dark:text-zinc-400"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <svg
                  className="mx-2 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>

        <div className="ml-4 flex items-center gap-3">
          {showCopyLink && <CopyLinkButton />}
          {actions}
        </div>
      </div>
    </div>
  )
}
