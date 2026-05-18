'use client'

import clsx from 'clsx'
import { Database, FileText, Home, Layers, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMobileNavigationStore } from './MobileNavigation'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/stack', icon: Layers, label: 'Stack' },
  { href: '/database', icon: Database, label: 'Database' },
  { href: '/system/logs', icon: FileText, label: 'Logs' },
  { icon: Menu, label: 'More', isMenu: true },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const { toggle } = useMobileNavigationStore()

  const isFullscreenPage =
    pathname === '/login' ||
    pathname === '/build' ||
    pathname === '/start' ||
    pathname.startsWith('/init')

  if (isFullscreenPage) {
    return null
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-sm lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === pathname

          if (item.isMenu) {
            return (
              <button
                key="menu"
                onClick={toggle}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
                  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                  'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                )}
                aria-label="Open menu"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
              )}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
