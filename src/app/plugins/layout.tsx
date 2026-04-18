'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function todayKey(): string {
  return `nself_updates_dismissed_${new Date().toISOString().slice(0, 10)}`
}

interface AvailableUpdate {
  name: string
  installed: string
  latest: string
  tier: string
}

interface UpdatesResponse {
  success: boolean
  updates: AvailableUpdate[]
  count: number
  checkedAt: string
}

function UpdateBanner() {
  const [dismissed, setDismissed] = useState(false)

  const { data } = useSWR<UpdatesResponse>('/api/plugins/updates', fetcher, {
    refreshInterval: 300000, // re-check every 5 minutes
    revalidateOnFocus: false,
  })

  // Check dismissal state after mount (localStorage is client-only)
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(todayKey()) === '1')
    } catch {
      // localStorage unavailable (e.g. incognito strict mode) — show the banner
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem(todayKey(), '1')
    } catch {
      // ignore write failures
    }
    setDismissed(true)
  }

  const count = data?.updates?.length ?? 0

  if (!data?.success || count === 0 || dismissed) {
    return null
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
      <span>
        {count} plugin update{count !== 1 ? 's' : ''} available.{' '}
        <Link
          href="/plugins?filter=updates"
          className="font-medium underline underline-offset-2 hover:text-yellow-200"
        >
          View updates
        </Link>
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        className="ml-4 rounded p-0.5 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function PluginsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <UpdateBanner />
      {children}
    </div>
  )
}
