'use client'

import { PageShell } from '@/components/PageShell'
import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceEntry {
  name: string
  status: string
  replicas?: number
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
        replicas: parts[2] ? parseInt(parts[2], 10) || undefined : undefined,
      }
    })
  }
}

function ScaleContent() {
  const [services, setServices] = useState<ServiceEntry[]>([])
  const [replicaInputs, setReplicaInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scalingService, setScalingService] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: ['ps'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch services')
        return
      }
      const list = parseServices(json.data?.stdout || '')
      setServices(list)
      const inputs: Record<string, string> = {}
      for (const svc of list) {
        inputs[svc.name] = String(svc.replicas ?? 1)
      }
      setReplicaInputs(inputs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchServices()
  }, [fetchServices])

  const handleScale = async (name: string) => {
    const replicas = replicaInputs[name]
    if (!replicas || isNaN(Number(replicas)) || Number(replicas) < 0) {
      setActionError(`Invalid replica count for ${name}`)
      return
    }
    setScalingService(name)
    setActionSuccess(null)
    setActionError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'scale', args: [name, replicas] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(`${name}: ${json.error || json.details || 'scale failed'}`)
      } else {
        setActionSuccess(
          `${name} scaled to ${replicas} replica${Number(replicas) === 1 ? '' : 's'}`
        )
        await fetchServices()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setScalingService(null)
    }
  }

  return (
    <PageShell
      title="Scale Services"
      description="Scale services up or down by adjusting replica counts."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchServices()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
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
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load services</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && services.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No services found. Start your nSelf stack first.
            </CardContent>
          </Card>
        )}

        {!loading && !error && services.length > 0 && (
          <div className="space-y-3">
            {services.map((svc) => {
              const isRunning = svc.status === 'running' || svc.status === 'healthy'
              const busy = scalingService === svc.name
              return (
                <Card key={svc.name}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-mono">{svc.name}</span>
                      <Badge
                        variant={isRunning ? 'default' : 'secondary'}
                        className={isRunning ? 'bg-green-600' : ''}
                      >
                        {svc.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3 pt-0">
                    <label className="text-muted-foreground shrink-0 text-sm">Replicas</label>
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      value={replicaInputs[svc.name] ?? '1'}
                      onChange={(e) =>
                        setReplicaInputs((prev) => ({ ...prev, [svc.name]: e.target.value }))
                      }
                      className="h-8 w-24 text-sm"
                      disabled={busy || !!scalingService}
                    />
                    <Button
                      size="sm"
                      onClick={() => void handleScale(svc.name)}
                      disabled={busy || !!scalingService}
                      className="h-8"
                    >
                      {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Apply
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function ScalePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ScaleContent />
    </Suspense>
  )
}
