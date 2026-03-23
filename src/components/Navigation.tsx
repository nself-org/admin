'use client'

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useIsInsideMobileNavigation } from '@/components/MobileNavigation'
import { useSectionStore } from '@/components/SectionProvider'
import { Tag } from '@/components/Tag'
import {
  navigation,
  type NavGroup,
  type NavLink as NavLinkType,
} from '@/lib/navigation'
import { remToPx } from '@/lib/remToPx'
import { CloseButton } from '@headlessui/react'

// ---- License status widget --------------------------------------------------

interface LicenseInfo {
  tier: string
  features?: string[]
  expires_at?: string
}

// Module-level cache — survives re-renders, expires after 10 minutes
let _licenseCache: { data: LicenseInfo | null; at: number } | null = null
const LICENSE_CACHE_TTL_MS = 10 * 60 * 1000

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function LicenseWidget() {
  const [info, setInfo] = useState<LicenseInfo | null>(null)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    const now = Date.now()
    if (_licenseCache && now - _licenseCache.at < LICENSE_CACHE_TTL_MS) {
      if (_licenseCache.data) {
        setInfo(_licenseCache.data)
      } else {
        setFetchFailed(true)
      }
      return
    }

    fetch('http://127.0.0.1:8001/license/info')
      .then((res) =>
        res.ok ? (res.json() as Promise<LicenseInfo>) : Promise.reject(),
      )
      .then((data) => {
        _licenseCache = { data, at: now }
        setInfo(data)
        setFetchFailed(false)
      })
      .catch(() => {
        _licenseCache = { data: null, at: now }
        setFetchFailed(true)
      })
  }, [])

  const isOwner =
    info?.tier === 'enterprise' && info?.features?.includes('all_plugins')
  const isMax = !isOwner && info?.tier === 'enterprise'
  const isPro = !isOwner && info?.tier === 'pro'

  if (isOwner) {
    return (
      <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Owner — Unlimited
        </span>
      </div>
    )
  }

  if (isMax && info?.expires_at) {
    return (
      <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Max · expires in {daysUntil(info.expires_at)}d
        </span>
      </div>
    )
  }

  if (isPro && info?.expires_at) {
    return (
      <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
          Pro · expires in {daysUntil(info.expires_at)}d
        </span>
      </div>
    )
  }

  if (!info || fetchFailed) {
    return (
      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          No membership
        </span>
        <Link
          href="https://nself.org/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white"
        >
          Buy
        </Link>
      </div>
    )
  }

  // Tier exists but no expiry or unrecognised tier — show nothing
  return null
}

function useInitialValue<T>(value: T, condition = true) {
  let initialValue = useRef(value).current
  return condition ? initialValue : value
}

function TopLevelNavItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li className="md:hidden">
      <CloseButton
        as={Link}
        href={href}
        className="block py-1 text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        {children}
      </CloseButton>
    </li>
  )
}

function NavLink({
  href,
  children,
  tag,
  active = false,
  isAnchorLink = false,
  badge,
  status,
}: {
  href: string
  children: React.ReactNode
  tag?: string
  active?: boolean
  isAnchorLink?: boolean
  badge?: string | { text: string; color: string }
  status?: 'running' | 'stopped' | 'error' | 'healthy' | 'unhealthy'
}) {
  const badgeText = typeof badge === 'string' ? badge : badge?.text
  const badgeColor = typeof badge === 'string' ? 'zinc' : badge?.color || 'zinc'

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex justify-between gap-2 py-1 pr-3 pl-7 text-sm transition',
        isAnchorLink ? 'pl-7' : 'pl-4',
        active
          ? 'text-zinc-900 dark:text-white'
          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {status && (
          <>
            <span className="sr-only">
              {status === 'running' || status === 'healthy'
                ? 'Running'
                : status === 'stopped'
                  ? 'Stopped'
                  : 'Error'}
            </span>
            <span
              aria-hidden="true"
              className={clsx('h-1.5 w-1.5 rounded-full', {
                'bg-green-500': status === 'running' || status === 'healthy',
                'bg-zinc-400': status === 'stopped',
                'bg-red-500': status === 'error' || status === 'unhealthy',
              })}
            />
          </>
        )}
        {children}
      </span>
      {tag && (
        <Tag variant="small" color="zinc">
          {tag}
        </Tag>
      )}
      {badgeText && !tag && (
        <span
          className={clsx(
            'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            {
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                badgeColor === 'emerald',
              'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-500':
                badgeColor === 'zinc',
            },
          )}
        >
          {badgeText}
        </span>
      )}
    </Link>
  )
}

function DisabledNavItem({ link }: { link: NavLinkType }) {
  const badgeText =
    typeof link.badge === 'string'
      ? link.badge
      : link.badge
        ? link.badge.text
        : 'Soon'

  return (
    <span
      className="flex cursor-not-allowed justify-between gap-2 py-1 pr-3 pl-4 text-sm text-zinc-400 select-none dark:text-zinc-600"
      title={link.description}
    >
      <span className="truncate">{link.title}</span>
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
        {badgeText}
      </span>
    </span>
  )
}

function ActivePageMarker({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  let itemHeight = remToPx(2)
  let offset = remToPx(0.25)
  let activePageIndex = group.links.findIndex((link) => link.href === pathname)
  let top = offset + activePageIndex * itemHeight

  return (
    <motion.div
      layout
      className="absolute left-2 h-6 w-px bg-blue-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      style={{ top }}
    />
  )
}

function NavigationGroup({
  group,
  className,
}: {
  group: NavGroup
  className?: string
}) {
  let isInsideMobileNavigation = useIsInsideMobileNavigation()
  let [pathname, sections] = useInitialValue(
    [usePathname(), useSectionStore((s) => s.sections)],
    isInsideMobileNavigation,
  )

  let isActiveGroup =
    group.links.findIndex(
      (link) => link.href === pathname && !link.disabled,
    ) !== -1

  // Store collapsed state in localStorage
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // If this group contains the active page, expand it by default
    if (isActiveGroup) {
      setIsCollapsed(false)
      localStorage.setItem(`nav-collapsed-${group.title}`, 'false')
    } else {
      const savedState = localStorage.getItem(`nav-collapsed-${group.title}`)
      if (savedState === null) {
        // Default to collapsed for non-active groups
        setIsCollapsed(true)
      } else {
        setIsCollapsed(savedState === 'true')
      }
    }
  }, [group.title, isActiveGroup, pathname])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(`nav-collapsed-${group.title}`, String(newState))
  }

  return (
    <li className={clsx('relative mt-6', className)}>
      <button
        onClick={toggleCollapsed}
        aria-expanded={isCollapsed ? 'false' : 'true'}
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.title} section`}
        className="flex w-full items-center justify-between text-sm font-semibold text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      >
        <span>{group.title}</span>
        {isCollapsed ? (
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <AnimatePresence initial={!isInsideMobileNavigation}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative mt-3 pl-2">
              <AnimatePresence initial={false}>
                {isActiveGroup && (
                  <ActivePageMarker group={group} pathname={pathname} />
                )}
              </AnimatePresence>
              <ul
                role="list"
                className="border-l border-zinc-200 dark:border-zinc-800"
              >
                {group.links.map((link) => (
                  <motion.li
                    key={link.href}
                    layout="position"
                    className="relative"
                  >
                    {link.disabled ? (
                      <DisabledNavItem link={link} />
                    ) : (
                      <>
                        <NavLink
                          href={link.href}
                          active={link.href === pathname}
                          badge={link.badge}
                          status={link.status}
                        >
                          {link.title}
                        </NavLink>
                        <AnimatePresence mode="popLayout" initial={false}>
                          {link.href === pathname && sections.length > 0 && (
                            <motion.ul
                              role="list"
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: 1,
                                transition: { delay: 0.1 },
                              }}
                              exit={{
                                opacity: 0,
                                transition: { duration: 0.15 },
                              }}
                            >
                              {sections.map((section) => (
                                <li key={section.id}>
                                  <NavLink
                                    href={`${link.href}#${section.id}`}
                                    tag={section.tag}
                                    isAnchorLink
                                  >
                                    {section.title}
                                  </NavLink>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function Navigation(props: React.ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav {...props} aria-label="Main navigation">
      <ul>
        <TopLevelNavItem href="/">Overview</TopLevelNavItem>
        <TopLevelNavItem href="/help">Documentation</TopLevelNavItem>
        {navigation.map((group, groupIndex) => (
          <NavigationGroup
            key={group.title}
            group={group}
            className={groupIndex === 0 ? 'md:mt-0' : ''}
          />
        ))}
      </ul>
      <LicenseWidget />
    </nav>
  )
}
