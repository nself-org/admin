'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  CheckCircle,
  Cloud,
  Loader2,
  RefreshCw,
  Rocket,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface DeployStatus {
  environment: string
  version: string
  lastDeployed: string
  status: string
}

function parseDeployStatus(stdout: string): DeployStatus | null {
  if (!stdout.trim()) return null
  try {
    return JSON.parse(stdout) as DeployStatus
  } catch {
    const lines = stdout.split('\n').filter(Boolean)
    const find = (key: string) => {
      const line = lines.find((l) => l.toLowerCase().includes(key))
      return line ? line.split(':').slice(1).join(':').trim() : ''
    }
    return {
      environment: find('environment') || find('env') || '',
      version: find('version') || '',
      lastDeployed: find('deployed') || find('time') || '',
      status: find('status') || '',
    }
  }
}

function DeployContent() {
  const [status, setStatus] = useState<DeployStatus | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [targetEnv, setTargetEnv] = useState<'staging' | 'production'>('staging')
  const [confirmDeploy, setConfirmDeploy] = useState(false)
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
        setError(json.error || 'Failed to fetch deploy status')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setStatus(parseDeployStatus(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const runDeploy = async () => {
    setActionInProgress(true)
    setActionSuccess(false)
    setActionError(null)
    setConfirmDeploy(false)
    setLastCommand(`nself deploy ${targetEnv}`)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'deploy', args: [targetEnv] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(json.error || json.details || 'Deploy failed')
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
    <PageShell title="Deploy" description="Deploy your nSelf stack to staging or production.">
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
              <CheckCircle className="h-3 w-3" /> Deploy succeeded
            </Badge>
          )}
          {actionError && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> Deploy failed
            </Badge>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load deploy status</p>
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
                <Cloud className="h-5 w-5" />
                Current Deployment
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Environment</p>
                <p className="font-medium">{status.environment || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Version</p>
                <p className="font-medium">{status.version || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last Deployed</p>
                <p className="font-medium">{status.lastDeployed || '—'}</p>
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
              No deployment status available. Run a deploy to get started.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deploy
            </CardTitle>
            <CardDescription>Select an environment and trigger a deployment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="env-select">Target Environment</Label>
                <Select
                  value={targetEnv}
                  onValueChange={(v) => setTargetEnv(v as 'staging' | 'production')}
                >
                  <SelectTrigger id="env-select" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setConfirmDeploy(true)}
                disabled={actionInProgress || loading}
                className="gap-2"
              >
                {actionInProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {actionInProgress ? 'Deploying…' : 'Deploy'}
              </Button>
            </div>

            {confirmDeploy && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Confirm deploy to {targetEnv}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        This will run <code>nself deploy {targetEnv}</code> and push changes live.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void runDeploy()}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmDeploy(false)}>
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

export default function DeployPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <DeployContent />
    </Suspense>
  )
}
