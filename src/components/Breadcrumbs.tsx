'use client'

import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href: string
}

const pathLabels: Record<string, string> = {
  docker: 'Docker',
  containers: 'Containers',
  images: 'Images',
  services: 'Services',
  config: 'Configuration',
  database: 'Database',
  logs: 'Logs',
  monitoring: 'Monitoring',
  settings: 'Settings',
  backup: 'Backup & Restore',
}

export function Breadcrumbs() {
  const pathname = usePathname()

  // Generate breadcrumb items from path
  const segments = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    items.push({ label, href })
  })

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center space-x-2 overflow-x-auto text-sm text-gray-600 dark:text-gray-400"
    >
      <Link
        href="/"
        className="flex flex-shrink-0 items-center transition-colors hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {items.map((item, index) => (
        <div key={item.href} className="flex flex-shrink-0 items-center">
          <ChevronRight className="mx-1 h-4 w-4 flex-shrink-0" />
          {index === items.length - 1 ? (
            <span className="font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="transition-colors hover:text-gray-900 dark:hover:text-gray-100"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

// Mobile-responsive breadcrumbs with dropdown for long paths
export function MobileBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const currentSegment = segments[segments.length - 1] ?? ''
  const currentLabel =
    pathLabels[currentSegment] || currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1)

  const parentPath = segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : '/'

  return (
    <nav className="mb-4 flex items-center space-x-2 text-sm md:hidden">
      <Link href={parentPath} className="text-blue-600 hover:underline dark:text-blue-400">
        ← Back
      </Link>
      <span className="text-gray-500">|</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{currentLabel}</span>
    </nav>
  )
}
