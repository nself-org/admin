'use client'

import { PageShell } from '@/components/PageShell'
import { CardGridSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Layers, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface StackService {
  name: string
  status: string
  version?: string
  port?: string
}

function parseStackStatus(stdout: string): StackService[] {
  if (!stdout.trim()) return []
  try {
    const parsed = JSON.parse(stdout)
    if (Array.isArray(parsed)) return parsed as StackService[]
    if (parsed && typeof parsed === 'object' && 'services' in parsed) {
      return (parsed as { services: StackService[] }).services
    }
    return []
  } catch {
    const lines = stdout.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    return lines.map((line) => {
      const parts = line.trim().split(/\s{2,}|\t/)
      return {
        name: parts[0] ?? line,
        status: parts[1] ?? 'unknown',
        version: parts[2],
        port: parts[3],
      }
    })
  }
}

function StackContent() {
  const [services, setServices] = useState<StackService[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'server', args: ['status', '--json'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch stack status')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setServices(parseStackStatus(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const runningCount = services.filter(
    (s) => s.status === 'running' || s.status === 'healthy' || s.status === 'up'
  ).length

  return (
    <PageShell title="Stack" description="Overview of all core nSelf stack services.">
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
          {!loading && services.length > 0 && (
            <Badge
              variant={runningCount === services.length ? 'default' : 'destructive'}
              className={runningCount === services.length ? 'bg-green-600' : ''}
            >
              {runningCount}/{services.length} running
            </Badge>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load stack status</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && services.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No services found. Run <code className="text-xs">nself start</code> to start the
              stack.
            </CardContent>
          </Card>
        )}

        {!loading && !error && services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Services ({services.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((svc) => {
                  const isRunning =
                    svc.status === 'running' || svc.status === 'healthy' || svc.status === 'up'
                  return (
                    <div
                      key={svc.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">{svc.name}</p>
                        {svc.version && (
                          <p className="text-muted-foreground text-xs">{svc.version}</p>
                        )}
                        {svc.port && <p className="text-muted-foreground text-xs">:{svc.port}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        {isRunning ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="text-destructive h-4 w-4" />
                        )}
                        <Badge
                          variant={isRunning ? 'default' : 'secondary'}
                          className={isRunning ? 'bg-green-600' : ''}
                        >
                          {svc.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {output && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground font-mono text-sm">
                nself server status --json
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

export default function StackPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <StackContent />
    </Suspense>
  )
}
