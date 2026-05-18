'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SessionTimeoutWarningProps {
  warningMinutes?: number // Show warning X minutes before timeout
  sessionDurationMinutes?: number // Total session duration
}

export function SessionTimeoutWarning({ warningMinutes = 5 }: SessionTimeoutWarningProps) {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  useEffect(() => {
    // Get session expiration from login response or calculate
    const checkSessionExpiry = async () => {
      try {
        const response = await fetch('/api/auth/session-info')
        if (response.ok) {
          const data = await response.json()
          if (data.expiresAt) {
            const expiryTime = new Date(data.expiresAt).getTime()
            const now = Date.now()
            const remaining = expiryTime - now

            // Show warning if less than warningMinutes remaining
            const warningThreshold = warningMinutes * 60 * 1000
            if (remaining <= warningThreshold && remaining > 0) {
              setTimeRemaining(Math.floor(remaining / 1000 / 60))
              setShowWarning(true)
            } else if (remaining <= 0) {
              // Session expired, redirect to login
              router.push('/login?expired=true')
            }
          }
        }
      } catch {
        // Ignore errors in session check
      }
    }

    // Check immediately
    checkSessionExpiry()

    // Check every minute
    const interval = setInterval(checkSessionExpiry, 60 * 1000)

    return () => clearInterval(interval)
  }, [router, warningMinutes])

  const handleExtendSession = async () => {
    try {
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
      })

      if (response.ok) {
        setShowWarning(false)
        setTimeRemaining(0)
      }
    } catch {
      // If refresh fails, show error
      alert('Failed to extend session. Please log in again.')
    }
  }

  const handleLogout = () => {
    router.push('/api/auth/logout')
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in approximately {timeRemaining} minute
            {timeRemaining !== 1 ? 's' : ''}. Would you like to extend your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>Logout Now</AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>Extend Session</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
