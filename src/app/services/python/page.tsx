'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceEntry {
  name: string
  status: string
  uptime?: string
  port?: string
}

function parseServices(stdout: string): ServiceEntry[] {
  if (!stdout.trim()) return []
  try {
    const parsed = JSON.parse(stdout)
    if (Array.isArray(parsed)) return parsed as ServiceEntry[]
    return []
  } catch {
    const lines = stdout.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    return lines.map((line) => {
      const parts = line.trim().split(/\s{2,}|\t/)
      return {
        name: parts[0] ?? line,
        status: parts[1] ?? 'unknown',
        uptime: parts[2],
        port: parts[3],
      }
    })
  }
}

function PythonContent() {
  const [services, setServices] = useState<ServiceEntry[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: ['ps', '--type', 'python'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch services')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setServices(parseServices(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchServices()
  }, [fetchServices])

  const runAction = async (action: 'start' | 'stop' | 'restart', name: string) => {
    setActiveAction(`${action}:${name}`)
    setActionSuccess(null)
    setActionError(null)
    setConfirmStop(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: [action, name] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(`${name}: ${json.error || json.details || `${action} failed`}`)
      } else {
        setActionSuccess(`${name} ${action} complete`)
        setOutput(json.data?.stdout || '')
        await fetchServices()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <PageShell title="Python Services" description="Manage Python microservices registered with nSelf.">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void fetchServices()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          {actionSuccess && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" /> {actionSuccess}
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
              <div className="flex items-start gap-2 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load Python services</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && services.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No Python services registered.
            </CardContent>
          </Card>
        )}

        {confirmStop && (
          <Card className="border-destructive bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Stop {confirmStop}?</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => void runAction('stop', confirmStop)}>
                      Confirm Stop
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmStop(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && services.length > 0 && (
          <div className="space-y-3">
            {services.map((svc) => {
              const isRunning = svc.status === 'running' || svc.status === 'healthy'
              const busy = activeAction?.endsWith(`:${svc.name}`)
              return (
                <Card key={svc.name}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-mono">{svc.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isRunning ? 'default' : 'secondary'}
                          className={isRunning ? 'bg-green-600' : ''}
                        >
                          {svc.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void runAction('restart', svc.name)}
                          disabled={!!busy || !!activeAction}
                          className="h-7 gap-1 text-xs"
                        >
                          {busy && activeAction?.startsWith('restart') ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Restart
                        </Button>
                        {isRunning ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmStop(svc.name)}
                            disabled={!!busy || !!activeAction}
                            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                          >
                            {busy && activeAction?.startsWith('stop') ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Square className="h-3 w-3" />
                            )}
                            Stop
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void runAction('start', svc.name)}
                            disabled={!!busy || !!activeAction}
                            className="h-7 gap-1 text-xs"
                          >
                            {busy && activeAction?.startsWith('start') ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Start
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {(svc.uptime ?? svc.port) && (
                    <CardContent className="flex gap-6 pt-0 text-xs text-muted-foreground">
                      {svc.uptime && <span>Uptime: {svc.uptime}</span>}
                      {svc.port && <span>Port: {svc.port}</span>}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {output && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                nself service ps --type python
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded bg-muted p-4 text-xs">{output}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}

export default function PythonPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <PythonContent />
    </Suspense>
  )
}
