'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Settings,
  Terminal,
  WifiOff,
} from 'lucide-react'
import { useState } from 'react'

const ENVIRONMENTS = [
  { value: 'local', label: 'Local', description: 'Local development' },
  { value: 'dev', label: 'Dev', description: 'Shared development' },
  { value: 'stage', label: 'Stage', description: 'Staging environment' },
  { value: 'prod', label: 'Prod', description: 'Production environment' },
]

type ActionState = 'idle' | 'running' | 'success' | 'error' | 'unauth' | 'offline'

export default function ConfigSyncPage() {
  const [source, setSource] = useState('local')
  const [target, setTarget] = useState('dev')
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [lastOutput, setLastOutput] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const runSync = async () => {
    if (source === target) {
      setLastOutput('Error: Source and target environments must be different.')
      setActionState('error')
      return
    }

    setActionState('running')
    setLastOutput('')
    setErrorMessage('')

    try {
      const response = await fetch('/api/config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target }),
      })

      if (response.status === 401) {
        setActionState('unauth')
        return
      }

      const data = await response.json()
      const output =
        data.data?.output || data.data?.stderr || data.error || data.details
      setLastOutput(output || JSON.stringify(data, null, 2))

      if (data.success) {
        setLastSyncTime(new Date().toISOString())
        setActionState('success')
      } else {
        setErrorMessage(output || 'Sync failed')
        setActionState('error')
      }
    } catch (_err) {
      setLastOutput('Network error — could not reach admin API.')
      setErrorMessage('Cannot reach admin API. Check your network connection.')
      setActionState('offline')
    }
  }

  const checkStatus = async () => {
    setActionState('running')
    setLastOutput('')
    setErrorMessage('')

    try {
      const response = await fetch('/api/config/sync')

      if (response.status === 401) {
        setActionState('unauth')
        return
      }

      const data = await response.json()
      const output =
        data.data?.output || data.data?.stderr || data.error || data.details
      setLastOutput(output || JSON.stringify(data, null, 2))
      setActionState(data.success ? 'success' : 'error')
      if (!data.success) setErrorMessage(output || 'Status check failed')
    } catch (_err) {
      setLastOutput('Network error — could not reach admin API.')
      setErrorMessage('Cannot reach admin API. Check your network connection.')
      setActionState('offline')
    }
  }

  if (actionState === 'unauth') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-sm text-muted-foreground">Please log in to manage config sync.</p>
        <Button variant="outline" onClick={() => { window.location.href = '/login' }}>Go to Login</Button>
      </div>
    )
  }

  if (actionState === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Cannot connect to admin API</p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button variant="outline" onClick={() => setActionState('idle')}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          Config Sync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Synchronize configuration between environments using the nself CLI.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertTitle>nself CLI Integration</AlertTitle>
        <AlertDescription>
          This page executes{' '}
          <code className="rounded bg-muted px-1 text-xs">
            nself config sync
          </code>{' '}
          to synchronize environment configuration files between environments.
        </AlertDescription>
      </Alert>

      {actionState === 'success' && lastSyncTime && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Last sync: {new Date(lastSyncTime).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {actionState === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sync Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <CardTitle>Sync Configuration</CardTitle>
            </div>
            <CardDescription>
              Select source and target environments to sync configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Selectors */}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Source
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((env) => (
                      <SelectItem key={env.value} value={env.value}>
                        <div className="flex items-center gap-2">
                          <span>{env.label}</span>
                          <span className="text-xs text-zinc-500">
                            ({env.description})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArrowRight className="mt-6 h-5 w-5 text-zinc-400" />

              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Target
                </label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((env) => (
                      <SelectItem key={env.value} value={env.value}>
                        <div className="flex items-center gap-2">
                          <span>{env.label}</span>
                          <span className="text-xs text-zinc-500">
                            ({env.description})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {source === target && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Source and target must be different environments.
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={runSync}
                disabled={actionState === 'running' || source === target}
                className="flex-1"
                size="lg"
              >
                {actionState === 'running' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Config
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={checkStatus}
                disabled={actionState === 'running'}
              >
                Check Status
              </Button>
            </div>

            {/* Command Preview */}
            <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
              <div className="flex items-center gap-2 text-zinc-500">
                <Terminal className="h-4 w-4" />
                <span>Command:</span>
              </div>
              <div className="mt-2">
                $ nself config sync --from={source} --to={target}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLI Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80 rounded-lg bg-zinc-950 p-4">
              {lastOutput ? (
                <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                  {lastOutput}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  Run a sync to see output here
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
