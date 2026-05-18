'use client'

import { useSession } from '@/hooks/useSession'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

export function SessionWarning() {
  const { isExpiringSoon, minutesUntilExpiry, refreshSession, isRefreshing } = useSession()
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    // Show warning if session is expiring soon
    setShowWarning(isExpiringSoon && minutesUntilExpiry > 0)
  }, [isExpiringSoon, minutesUntilExpiry])

  if (!showWarning) return null

  const hours = Math.floor(minutesUntilExpiry / 60)
  const minutes = minutesUntilExpiry % 60

  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-md rounded-lg border border-yellow-500/20 bg-yellow-50 p-4 shadow-lg dark:bg-yellow-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
            Session Expiring Soon
          </h3>
          <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
            Your session will expire in {hours > 0 && `${hours} hour${hours > 1 ? 's' : ''} and `}
            {minutes} minute{minutes !== 1 ? 's' : ''}. You'll be automatically logged out.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => refreshSession()}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-500 dark:hover:bg-yellow-600"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Extend Session
                </>
              )}
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="rounded px-3 py-1.5 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100 dark:text-yellow-200 dark:hover:bg-yellow-800/30"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
