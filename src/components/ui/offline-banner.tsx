'use client'

/**
 * Offline banner component - shows when user is offline
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        // Hide reconnected message after 3 seconds
        setTimeout(() => {
          setShowReconnected(false)
          setWasOffline(false)
        }, 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowReconnected(false)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  // Don't render if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-50 px-4 pt-4">
      <Alert variant={isOnline ? 'default' : 'destructive'} className="mx-auto max-w-2xl shadow-lg">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <AlertDescription className="font-medium">
            {isOnline
              ? 'Connection restored. You are back online.'
              : "You're offline. Some features may not work until you reconnect."}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  )
}
