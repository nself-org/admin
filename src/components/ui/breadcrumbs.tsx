'use client'

/**
 * Breadcrumbs component - Displays page path navigation
 *
 * @example
 * ```tsx
 * <Breadcrumbs>
 *   <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItem href="/services">Services</BreadcrumbItem>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItem>PostgreSQL</BreadcrumbItem>
 * </Breadcrumbs>
 * ```
 */

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

const Breadcrumbs = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode
  }
>(({ className, children, separator: _separator, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="Breadcrumb"
    className={cn('flex items-center space-x-1 text-sm', className)}
    {...props}
  >
    <ol className="flex items-center space-x-1">{children}</ol>
  </nav>
))
Breadcrumbs.displayName = 'Breadcrumbs'

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'> & {
    href?: string
    active?: boolean
  }
>(({ className, href, active, children, ...props }, ref) => {
  const isActive = active ?? !href

  return (
    <li
      ref={ref}
      className={cn(
        'inline-flex items-center',
        isActive && 'text-foreground font-medium',
        !isActive && 'text-muted-foreground hover:text-foreground',
        className
      )}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    >
      {href && !isActive ? (
        <Link href={href} className="hover:text-foreground transition-colors">
          {children}
        </Link>
      ) : (
        children
      )}
    </li>
  )
})
BreadcrumbItem.displayName = 'BreadcrumbItem'

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'> & {
    children?: React.ReactNode
  }
>(({ className, children, ...props }, ref) => (
  <li
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn('text-muted-foreground inline-flex items-center', className)}
    {...props}
  >
    {children ?? <ChevronRight className="h-4 w-4" />}
  </li>
))
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator'

export { BreadcrumbItem, Breadcrumbs, BreadcrumbSeparator }
