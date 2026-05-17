'use client'

import { PageShell } from '@/components/PageShell'
import { LogViewerSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceEntry {
  name: string
  status: string
}

function parseServiceList(stdout: string): ServiceEntry[] {
  if (!stdout.trim()) return []
  try {
    const parsed = JSON.parse(stdout)
    if (Array.isArray(parsed)) return parsed as ServiceEntry[]
    return []
  } catch {
    const lines = stdout.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    return lines.map((line) => {
      const parts = line.trim().split(/\s{2,}|\t/)
      return { name: parts[0] ?? line, status: parts[1] ?? 'unknown' }
    })
  }
}

function LogsContent() {
  const [services, setServices] = useState<ServiceEntry[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [logOutput, setLogOutput] = useState('')
  const [servicesLoading, setServicesLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [logsError, setLogsError] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    setServicesLoading(true)
    setServicesError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: ['ps'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setServicesError(json.error || 'Failed to fetch service list')
        return
      }
      const list = parseServiceList(json.data?.stdout || '')
      setServices(list)
      if (list.length > 0 && !selectedService) {
        setSelectedService(list[0].name)
      }
    } catch (err) {
      setServicesError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setServicesLoading(false)
    }
  }, [selectedService])

  const fetchLogs = useCallback(async (serviceName: string) => {
    if (!serviceName) return
    setLogsLoading(true)
    setLogsError(null)
    setLogOutput('')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'service', args: ['logs', serviceName] }),
      })
      const json = await res.json()
      if (!json.success) {
        setLogsError(json.error || `Failed to fetch logs for ${serviceName}`)
        return
      }
      setLogOutput(json.data?.stdout || json.data?.stderr || '(no output)')
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchServices()
  }, [fetchServices])

  useEffect(() => {
    if (selectedService) {
      void fetchLogs(selectedService)
    }
  }, [selectedService, fetchLogs])

  const handleServiceChange = (value: string) => {
    setSelectedService(value)
  }

  const isRunning = (name: string) => {
    const svc = services.find((s) => s.name === name)
    return svc?.status === 'running' || svc?.status === 'healthy'
  }

  return (
    <PageShell title="Service Logs" description="View logs for all nSelf-managed services.">
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedService} onValueChange={handleServiceChange}>
            <SelectTrigger className="w-52" disabled={servicesLoading}>
              <SelectValue placeholder={servicesLoading ? 'Loading…' : 'Select service'} />
            </SelectTrigger>
            <SelectContent>
              {services.map((svc) => (
                <SelectItem key={svc.name} value={svc.name}>
                  <span className="font-mono text-sm">{svc.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedService && void fetchLogs(selectedService)}
            disabled={logsLoading || !selectedService}
          >
            {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Logs
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchServices()}
            disabled={servicesLoading}
          >
            {servicesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Services
          </Button>

          {selectedService && (
            <Badge
              variant={isRunning(selectedService) ? 'default' : 'secondary'}
              className={isRunning(selectedService) ? 'bg-green-600' : ''}
            >
              {services.find((s) => s.name === selectedService)?.status ?? 'unknown'}
            </Badge>
          )}
        </div>

        {servicesError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load service list</p>
                  <p className="text-sm opacity-80">{servicesError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!servicesLoading && !servicesError && services.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No services running. Start your nSelf stack first.
            </CardContent>
          </Card>
        )}

        {logsError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load logs</p>
                  <p className="text-sm opacity-80">{logsError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedService && !logsError && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                nself service logs {selectedService}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading logs…</span>
                </div>
              ) : (
                <pre className="overflow-x-auto overflow-y-auto max-h-[600px] rounded bg-muted p-4 text-xs font-mono whitespace-pre-wrap break-all">
                  {logOutput || '(no log output)'}
                </pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}

export default function LogsPage() {
  return (
    <Suspense fallback={<LogViewerSkeleton />}>
      <LogsContent />
    </Suspense>
  )
}
