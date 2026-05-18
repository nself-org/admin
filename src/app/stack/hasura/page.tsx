'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  RotateCcw,
  Share2,
  Square,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

const SERVICE = 'hasura'

interface ServiceStatus {
  name: string
  status: string
  version?: string
  uptime?: string
  port?: string
}

function parseServiceStatus(stdout: string): ServiceStatus | null {
  if (!stdout.trim()) return null
  try {
    return JSON.parse(stdout) as ServiceStatus
  } catch {
    const lines = stdout.split('\n').filter(Boolean)
    const find = (key: string) => {
      const line = lines.find((l) => l.toLowerCase().includes(key))
      return line ? line.split(':').slice(1).join(':').trim() : ''
    }
    return {
      name: SERVICE,
      status: find('status') || find('state') || 'unknown',
      version: find('version'),
      uptime: find('uptime'),
      port: find('port'),
    }
  }
}

function HasuraContent() {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionLabel, setActionLabel] = useState('')
  const [actionSuccess, setActionSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [lastCommand, setLastCommand] = useState('')

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand(`nself service ps ${SERVICE}`)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: ['ps', SERVICE] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch service status')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setStatus(parseServiceStatus(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const runAction = async (action: 'restart' | 'stop') => {
    setActionInProgress(true)
    setActionSuccess(false)
    setActionError(null)
    setConfirmStop(false)
    setActionLabel(action === 'restart' ? 'Restarting…' : 'Stopping…')
    setLastCommand(`nself service ${action} ${SERVICE}`)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: [action, SERVICE] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(json.error || json.details || `${action} failed`)
      } else {
        setActionSuccess(true)
        setOutput(json.data?.stdout || '')
        await fetchStatus()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionInProgress(false)
      setActionLabel('')
    }
  }

  const isRunning = status?.status === 'running' || status?.status === 'healthy'

  return (
    <PageShell title="Hasura" description="Hasura GraphQL engine management.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void fetchStatus()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runAction('restart')}
            disabled={actionInProgress || loading}
            className="gap-2"
          >
            {actionInProgress && actionLabel.includes('Restart') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {actionInProgress && actionLabel.includes('Restart') ? 'Restarting…' : 'Restart'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmStop(true)}
            disabled={actionInProgress || loading || !isRunning}
            className="text-destructive hover:text-destructive gap-2"
          >
            {actionInProgress && actionLabel.includes('Stop') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {actionInProgress && actionLabel.includes('Stop') ? 'Stopping…' : 'Stop'}
          </Button>
          {actionSuccess && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" /> Done
            </Badge>
          )}
          {actionError && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> {actionError}
            </Badge>
          )}
        </div>

        {confirmStop && (
          <Card className="border-destructive bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-destructive h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-destructive font-medium">Stop Hasura?</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Stopping Hasura will take down the GraphQL API.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => void runAction('stop')}>
                      Confirm Stop
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmStop(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load service status</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Hasura GraphQL Engine
                <Badge
                  variant={isRunning ? 'default' : 'secondary'}
                  className={isRunning ? 'bg-green-600' : ''}
                >
                  {status.status}
                </Badge>
              </CardTitle>
              {status.version && <CardDescription>{status.version}</CardDescription>}
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {status.uptime && (
                <div>
                  <p className="text-muted-foreground text-xs">Uptime</p>
                  <p className="font-medium">{status.uptime}</p>
                </div>
              )}
              {status.port && (
                <div>
                  <p className="text-muted-foreground text-xs">Port</p>
                  <p className="font-mono font-medium">{status.port}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !error && !status && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No status available.
            </CardContent>
          </Card>
        )}

        {output && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground font-mono text-sm">
                {lastCommand}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted overflow-x-auto rounded p-4 text-xs">{output}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}

export default function HasuraPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <HasuraContent />
    </Suspense>
  )
}
