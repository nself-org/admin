'use client'

import { PageShell } from '@/components/PageShell'
import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  CheckCircle,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceHealth {
  name: string
  status: string
  uptime?: string
  cpu?: string
  memory?: string
}

interface MonitorData {
  services: ServiceHealth[]
  overall: string
}

function parseMetrics(stdout: string): MonitorData | null {
  if (!stdout.trim()) return null
  try {
    return JSON.parse(stdout) as MonitorData
  } catch {
    const lines = stdout.split('\n').filter(Boolean)
    const services: ServiceHealth[] = lines
      .filter((l) => l.includes(':') || l.includes('\t'))
      .map((line) => {
        const parts = line.trim().split(/\s{2,}|\t/)
        return {
          name: parts[0] ?? line,
          status: parts[1] ?? 'unknown',
          cpu: parts[2],
          memory: parts[3],
        }
      })
    return { services, overall: services.every((s) => s.status === 'running') ? 'healthy' : 'degraded' }
  }
}

function MonitorContent() {
  const [data, setData] = useState<MonitorData | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState('')

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself health --all')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'health', args: ['--all'] }),
      })
      const json = await res.json()
      if (!json.success) {
        // Fallback to metrics command
        setLastCommand('nself metrics')
        const res2 = await fetch('/api/nself', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'metrics', args: [] }),
        })
        const json2 = await res2.json()
        if (!json2.success) {
          setError(json2.error || json.error || 'Failed to fetch metrics')
          return
        }
        const raw2 = json2.data?.stdout || ''
        setOutput(raw2)
        setData(parseMetrics(raw2))
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setData(parseMetrics(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMetrics()
  }, [fetchMetrics])

  const overallVariant =
    data?.overall === 'healthy' ? 'default' : data?.overall ? 'destructive' : 'secondary'
  const overallClass = data?.overall === 'healthy' ? 'bg-green-600' : ''

  return (
    <PageShell title="Monitor" description="Real-time health and metrics for your nSelf stack.">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void fetchMetrics()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          {data && (
            <Badge variant={overallVariant} className={`gap-1 ${overallClass}`}>
              {data.overall === 'healthy' ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {data.overall}
            </Badge>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load metrics</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && data.services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Service Health ({data.services.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.services.map((svc, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-mono text-sm font-medium">{svc.name}</p>
                      {svc.uptime && (
                        <p className="text-xs text-muted-foreground">Uptime: {svc.uptime}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {svc.cpu && (
                        <span className="text-xs text-muted-foreground">CPU: {svc.cpu}</span>
                      )}
                      {svc.memory && (
                        <span className="text-xs text-muted-foreground">Mem: {svc.memory}</span>
                      )}
                      <Badge
                        variant={
                          svc.status === 'running' || svc.status === 'healthy'
                            ? 'default'
                            : svc.status === 'stopped'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className={
                          svc.status === 'running' || svc.status === 'healthy' ? 'bg-green-600' : ''
                        }
                      >
                        {svc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (!data || data.services.length === 0) && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No monitoring data available.
            </CardContent>
          </Card>
        )}

        {output && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">{lastCommand}</CardTitle>
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

export default function MonitorPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <MonitorContent />
    </Suspense>
  )
}
