'use client'

/**
 * SSE Provider Component
 * Initializes and manages the SSE stream connection at the app level
 */

import { useSSEStream } from '@/hooks/useSSEStream'
import { Circle, RefreshCw, WifiOff } from 'lucide-react'

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const { connected, reconnecting, error, lastUpdate, reconnect } = useSSEStream()

  return (
    <>
      {children}

      {/* Compact connection status indicator */}
      <div className="fixed right-4 bottom-4 z-50">
        <button
          onClick={!connected && !reconnecting ? reconnect : undefined}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-md backdrop-blur-sm transition-all duration-200 hover:shadow-lg ${
            connected
              ? 'cursor-default border border-green-500/30 bg-green-500/10 dark:bg-green-500/20'
              : reconnecting
                ? 'cursor-default border border-yellow-500/30 bg-yellow-500/10 dark:bg-yellow-500/20'
                : 'cursor-pointer border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30'
          } `}
          title={
            connected
              ? `Connected${lastUpdate > 0 ? ` • Last update: ${new Date(lastUpdate).toLocaleTimeString()}` : ''}`
              : reconnecting
                ? 'Reconnecting...'
                : `Disconnected${error ? ` • ${error}` : ''} • Click to retry`
          }
        >
          {/* Status icon */}
          {connected ? (
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          ) : reconnecting ? (
            <RefreshCw className="h-3 w-3 animate-spin text-yellow-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}

          {/* Status text */}
          <span
            className={`text-xs font-medium ${
              connected
                ? 'text-green-700 dark:text-green-300'
                : reconnecting
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-red-700 dark:text-red-300'
            }`}
          >
            {connected ? 'Connected' : reconnecting ? 'Reconnecting' : 'Disconnected'}
          </span>
        </button>
      </div>
    </>
  )
}
