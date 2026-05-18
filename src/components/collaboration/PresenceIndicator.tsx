/**
 * Presence Indicator Component
 * Shows online users with avatars and status
 */
'use client'

import { usePresence } from '@/hooks/useCollaboration'
import { User, Wifi, WifiOff } from 'lucide-react'
import { useEffect } from 'react'

interface PresenceIndicatorProps {
  roomId?: string
  currentPage?: string
  className?: string
}

export function PresenceIndicator({ roomId, currentPage, className = '' }: PresenceIndicatorProps) {
  const { onlineUsers, isConnected, updatePresence } = usePresence(roomId)

  // Update presence on mount and page change
  useEffect(() => {
    if (isConnected) {
      updatePresence('online', currentPage)
    }

    // Update to away after 5 minutes of inactivity
    let awayTimer: NodeJS.Timeout
    const resetAwayTimer = () => {
      clearTimeout(awayTimer)
      awayTimer = setTimeout(
        () => {
          updatePresence('away', currentPage)
        },
        5 * 60 * 1000
      )
    }

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => {
      window.addEventListener(event, resetAwayTimer)
    })

    resetAwayTimer()

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetAwayTimer)
      })
      clearTimeout(awayTimer)
      updatePresence('offline', currentPage)
    }
  }, [isConnected, currentPage, updatePresence])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection status */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
      </div>

      {/* Online users */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-500">{onlineUsers.length}</span>

          {/* User avatars */}
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 3).map((user) => (
              <div
                key={user.userId}
                className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ring-1 ring-gray-200"
                style={{ backgroundColor: user.metadata?.color || '#6B7280' }}
                title={`${user.userName} (${user.status})`}
              >
                <span className="text-xs font-medium text-white">
                  {user.userName.charAt(0).toUpperCase()}
                </span>
                {user.status === 'away' && (
                  <div className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-white bg-yellow-400" />
                )}
                {user.status === 'online' && (
                  <div className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-white bg-green-400" />
                )}
              </div>
            ))}
            {onlineUsers.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                +{onlineUsers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
