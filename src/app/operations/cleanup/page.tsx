'use client'

import { PageShell } from '@/components/PageShell'
import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface CleanupStatus {
  reclaimable: string
  items: string[]
  raw: string
}

function parseCleanupStatus(stdout: string): CleanupStatus | null {
  if (!stdout.trim()) return null
  try {
    return JSON.parse(stdout) as CleanupStatus
  } catch {
    const lines = stdout.split('\n').filter(Boolean)
    const reclaimable =
      lines
        .find((l) => l.toLowerCase().includes('reclaim') || l.toLowerCase().includes('freed'))
        ?.split(':')
        .slice(1)
        .join(':')
        .trim() ?? ''
    return {
      reclaimable,
      items: lines.filter((l) => l.trim().startsWith('-') || l.trim().startsWith('*')),
      raw: stdout,
    }
  }
}

function CleanupContent() {
  const [status, setStatus] = useState<CleanupStatus | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmClean, setConfirmClean] = useState(false)
  const [lastCommand, setLastCommand] = useState('')

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself clean --dry-run')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'clean', args: ['--dry-run'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch cleanup status')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setStatus(parseCleanupStatus(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const runClean = async () => {
    setActionInProgress(true)
    setActionSuccess(false)
    setActionError(null)
    setConfirmClean(false)
    setLastCommand('nself clean')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'clean', args: [] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(json.error || json.details || 'Cleanup failed')
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
    <PageShell title="Cleanup" description="Remove unused Docker resources and free disk space.">
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
              <CheckCircle className="h-3 w-3" /> Cleanup complete
            </Badge>
          )}
          {actionError && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> {actionError}
            </Badge>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load cleanup status</p>
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
                <Trash2 className="h-5 w-5" />
                Reclaimable Space
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status.reclaimable && (
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {status.reclaimable}
                </p>
              )}
              {(status.items?.length ?? 0) > 0 && (
                <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                  {status.items!.map((item, i) => (
                    <li key={i}>{item.replace(/^[-*]\s*/, '')}</li>
                  ))}
                </ul>
              )}
              {!status.reclaimable && (status.items?.length ?? 0) === 0 && (
                <p className="text-muted-foreground text-sm">Nothing to clean up.</p>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !error && !status && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No cleanup data available.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Run Cleanup
            </CardTitle>
            <CardDescription>
              Remove stopped containers, unused images, volumes, and build cache. Runs{' '}
              <code className="text-xs">nself clean</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="destructive"
              onClick={() => setConfirmClean(true)}
              disabled={actionInProgress || loading}
              className="gap-2"
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {actionInProgress ? 'Cleaning…' : 'Run Cleanup'}
            </Button>

            {confirmClean && (
              <Card className="border-destructive bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Confirm cleanup
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        This will remove stopped containers, dangling images, unused volumes, and
                        build cache. Running services will not be affected.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => void runClean()}>
                          Confirm Cleanup
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmClean(false)}>
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

export default function CleanupPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CleanupContent />
    </Suspense>
  )
}
