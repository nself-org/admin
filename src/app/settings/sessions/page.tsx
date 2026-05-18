'use client'

import { FormSkeleton } from '@/components/skeletons'
import { formatDistanceToNow } from 'date-fns'
import { Clock, MapPin, Monitor, Shield, Smartphone, Tablet, Trash2 } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

interface DeviceInfo {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  deviceModel: string
}

interface Session {
  token: string
  createdAt: string
  expiresAt: string
  lastActive: string
  ip: string
  rememberMe: boolean
  isCurrent: boolean
  device: DeviceInfo
}

function SessionsContent() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSessions(data.sessions)
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevoke = async (token: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return

    setIsRevoking(token)

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      const response = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        // Refresh sessions list
        await fetchSessions()
      } else {
        alert('Failed to revoke session')
      }
    } catch (error) {
      console.error('Error revoking session:', error)
      alert('Failed to revoke session')
    } finally {
      setIsRevoking(null)
    }
  }

  const handleRevokeAll = async () => {
    if (
      !confirm(
        'Are you sure you want to revoke all other sessions? You will remain logged in on this device.'
      )
    )
      return

    setIsRevoking('all')

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      const response = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ revokeAll: true }),
      })

      if (response.ok) {
        // Refresh sessions list
        await fetchSessions()
      } else {
        alert('Failed to revoke sessions')
      }
    } catch (error) {
      console.error('Error revoking sessions:', error)
      alert('Failed to revoke sessions')
    } finally {
      setIsRevoking(null)
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'tablet':
        return <Tablet className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  const formatSessionDuration = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true })
  }

  const formatLastActive = (lastActive: string) => {
    return formatDistanceToNow(new Date(lastActive), { addSuffix: true })
  }

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Active Sessions</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your active login sessions across devices
          </p>
        </div>
        {otherSessionsCount > 0 && (
          <button
            onClick={handleRevokeAll}
            disabled={isRevoking === 'all'}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Revoke All Others ({otherSessionsCount})
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.token}
              className={`rounded-lg border p-6 transition-colors ${
                session.isCurrent
                  ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                    {getDeviceIcon(session.device.device)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {session.device.browser}{' '}
                        {session.device.browserVersion &&
                          `v${session.device.browserVersion.split('.')[0]}`}
                      </h3>
                      {session.isCurrent && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          This device
                        </span>
                      )}
                      {session.rememberMe && (
                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                          Remember me
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {session.device.os}{' '}
                      {session.device.osVersion && `${session.device.osVersion.split('.')[0]}`}
                      {session.device.deviceModel && ` • ${session.device.deviceModel}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.ip}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active {formatLastActive(session.lastActive)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Created {formatSessionDuration(session.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevoke(session.token)}
                    disabled={isRevoking === session.token}
                    className="ml-4 flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-900 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SessionsContent />
    </Suspense>
  )
}
