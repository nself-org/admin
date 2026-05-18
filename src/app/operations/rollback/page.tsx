'use client'

import { PageShell } from '@/components/PageShell'
import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface RollbackStatus {
  currentVersion: string
  previousVersion: string
  lastRollback: string
  status: string
}

function parseRollbackStatus(stdout: string): RollbackStatus | null {
  if (!stdout.trim()) return null
  try {
    return JSON.parse(stdout) as RollbackStatus
  } catch {
    const lines = stdout.split('\n').filter(Boolean)
    const find = (key: string) => {
      const line = lines.find((l) => l.toLowerCase().includes(key))
      return line ? line.split(':').slice(1).join(':').trim() : ''
    }
    return {
      currentVersion: find('current') || find('version') || '',
      previousVersion: find('previous') || find('prior') || '',
      lastRollback: find('rollback') || find('time') || '',
      status: find('status') || '',
    }
  }
}

function RollbackContent() {
  const [status, setStatus] = useState<RollbackStatus | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmRollback, setConfirmRollback] = useState(false)
  const [lastCommand, setLastCommand] = useState('')

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself deploy status')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'deploy', args: ['status'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch deployment status')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setStatus(parseRollbackStatus(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const runRollback = async () => {
    setActionInProgress(true)
    setActionSuccess(false)
    setActionError(null)
    setConfirmRollback(false)
    setLastCommand('nself deploy rollback')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'deploy', args: ['rollback'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(json.error || json.details || 'Rollback failed')
      } else {
        setActionSuccess(true)
        setOutput(json.data?.stdout || '')
        await fetchStatus()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <PageShell
      title="Rollback"
      description="Roll back your nSelf stack to the previous deployment."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void fetchStatus()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          {actionSuccess && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" /> Rollback succeeded
            </Badge>
          )}
          {actionError && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> Rollback failed
            </Badge>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load deployment status</p>
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
                <History className="h-5 w-5" />
                Deployment History
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Current Version</p>
                <p className="font-medium">{status.currentVersion || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Previous Version</p>
                <p className="font-medium">{status.previousVersion || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last Rollback</p>
                <p className="font-medium">{status.lastRollback || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant={status.status === 'running' ? 'default' : 'secondary'}>
                  {status.status || 'unknown'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !status && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No deployment status available.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Rollback
            </CardTitle>
            <CardDescription>
              Revert to the previous deployment. This will run{' '}
              <code className="text-xs">nself deploy rollback</code> and cannot be undone without a
              fresh deploy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="destructive"
              onClick={() => setConfirmRollback(true)}
              disabled={actionInProgress || loading}
              className="gap-2"
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {actionInProgress ? 'Rolling back…' : 'Rollback Now'}
            </Button>

            {confirmRollback && (
              <Card className="border-destructive bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-destructive h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-destructive font-medium">Confirm rollback</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This will run <code>nself deploy rollback</code> and revert your stack to
                        the previous deployment. A fresh deploy is required to undo this.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => void runRollback()}>
                          Confirm Rollback
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRollback(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {actionError && <p className="text-destructive text-sm">{actionError}</p>}
          </CardContent>
        </Card>

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

export default function RollbackPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <RollbackContent />
    </Suspense>
  )
}
