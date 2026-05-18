'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface SessionInfo {
  expiresAt: string
  lastActive: string
  rememberMe: boolean
}

interface UseSessionReturn {
  sessionInfo: SessionInfo | null
  isExpiringSoon: boolean
  minutesUntilExpiry: number
  refreshSession: () => Promise<void>
  isRefreshing: boolean
}

// Check session every 10 minutes
const CHECK_INTERVAL = 10 * 60 * 1000

// Warn when 2 hours left (for 24h sessions)
const WARNING_THRESHOLD = 2 * 60 * 60 * 1000

// Auto-refresh when 4 hours left (20h mark for 24h sessions)
const REFRESH_THRESHOLD = 4 * 60 * 60 * 1000

export function useSession(): UseSessionReturn {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const refreshSession = useCallback(async () => {
    try {
      setIsRefreshing(true)

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to refresh session')
      }

      const data = await response.json()

      if (data.success) {
        setSessionInfo(data.session)
      } else {
        // Session refresh failed, redirect to login
        router.push('/login')
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      // On error, redirect to login
      router.push('/login')
    } finally {
      setIsRefreshing(false)
    }
  }, [router])

  const checkSession = useCallback(async () => {
    if (!sessionInfo) return

    const expiresAt = new Date(sessionInfo.expiresAt).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now

    // Auto-refresh if session expires in less than 4 hours
    if (timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0) {
      await refreshSession()
    }

    // If expired, redirect to login
    if (timeUntilExpiry <= 0) {
      router.push('/login')
    }
  }, [sessionInfo, refreshSession, router])

  // Initial session fetch
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const response = await fetch('/api/auth/session-info')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSessionInfo(data.session)
          }
        }
      } catch (error) {
        console.error('Error fetching session info:', error)
      }
    }

    fetchSessionInfo()
  }, [])

  // Set up periodic session check
  useEffect(() => {
    const interval = setInterval(checkSession, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [checkSession])

  // Calculate if session is expiring soon
  const isExpiringSoon = sessionInfo
    ? new Date(sessionInfo.expiresAt).getTime() - Date.now() < WARNING_THRESHOLD
    : false

  // Calculate minutes until expiry
  const minutesUntilExpiry = sessionInfo
    ? Math.floor((new Date(sessionInfo.expiresAt).getTime() - Date.now()) / 1000 / 60)
    : 0

  return {
    sessionInfo,
    isExpiringSoon,
    minutesUntilExpiry,
    refreshSession,
    isRefreshing,
  }
}
