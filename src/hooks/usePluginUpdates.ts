'use client'

import { useEffect, useState } from 'react'

export interface PluginUpdate {
  name: string
  installed: string
  latest: string
  tier: string
}

interface UsePluginUpdatesResult {
  updates: PluginUpdate[]
  loading: boolean
  error: string | null
  checkedAt: string | null
  refresh: () => Promise<void>
}

const DEFAULT_POLL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Poll /api/plugins/updates and expose the current list of installed plugins
 * that have a newer version available. Callers can toast when
 * `updates.length > 0` transitions from zero.
 */
export function usePluginUpdates(
  pollMs: number = DEFAULT_POLL_MS,
): UsePluginUpdatesResult {
  const [updates, setUpdates] = useState<PluginUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)

  const fetchUpdates = async () => {
    try {
      const res = await fetch('/api/plugins/updates', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error(`status ${res.status}`)
      }
      const body = await res.json()
      if (body?.success) {
        setUpdates(Array.isArray(body.updates) ? body.updates : [])
        setCheckedAt(body.checkedAt || new Date().toISOString())
        setError(null)
      } else {
        setError(body?.error || 'Failed to check for updates')
      }
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message || 'Failed to check for updates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await fetchUpdates()
    }
    tick()
    const id = window.setInterval(tick, pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pollMs])

  return {
    updates,
    loading,
    error,
    checkedAt,
    refresh: fetchUpdates,
  }
}
