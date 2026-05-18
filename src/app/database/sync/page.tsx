'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeftRight,
  CheckCircle,
  Database,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface SyncResult {
  success: boolean
  output?: string
  error?: string
  timestamp: string
  direction?: string
}

function DatabaseSyncContent() {
  const [isRunning, setIsRunning] = useState(false)
  const [syncDirection, setSyncDirection] = useState('pull')
  const [sourceEnv, setSourceEnv] = useState('staging')
  const [targetEnv, setTargetEnv] = useState('local')
  const [syncResults, setSyncResults] = useState<SyncResult[]>([])
  const [lastOutput, setLastOutput] = useState<string>('')

  /**
   * Execute nself db sync via the CLI API
   */
  const runSync = async () => {
    setIsRunning(true)
    setLastOutput('')

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          options: {
            direction: syncDirection,
            source: sourceEnv,
            target: targetEnv,
          },
        }),
      })

      const data = await response.json()

      const result: SyncResult = {
        success: data.success,
        output: data.data?.output || data.details,
        error: data.error,
        timestamp: new Date().toLocaleString(),
        direction: `${sourceEnv} → ${targetEnv}`,
      }

      setSyncResults((prev) => [result, ...prev.slice(0, 9)])
      setLastOutput(data.data?.output || data.details || '')
    } catch (error) {
      const result: SyncResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date().toLocaleString(),
      }
      setSyncResults((prev) => [result, ...prev.slice(0, 9)])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Sync Database</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Synchronize database between environments using{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            nself db sync
          </code>
        </p>
      </div>
      <div className="space-y-6">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>nself CLI Integration</AlertTitle>
          <AlertDescription>
            This page executes{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">nself db sync</code> to
            synchronize your database between environments.
          </AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <AlertTitle>Warning: Data Override</AlertTitle>
          <AlertDescription>
            Database sync will overwrite data in the target environment. Always backup your target
            database before syncing.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                <CardTitle>Database Sync</CardTitle>
              </div>
              <CardDescription>Copy database data between environments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sync Direction</label>
                  <Select value={syncDirection} onValueChange={setSyncDirection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pull">Pull (Remote → Local)</SelectItem>
                      <SelectItem value="push">Push (Local → Remote)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Source</label>
                    <Select value={sourceEnv} onValueChange={setSourceEnv}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="prod">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target</label>
                    <Select value={targetEnv} onValueChange={setTargetEnv}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="prod">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <Badge variant="outline">{sourceEnv}</Badge>
                  <ArrowLeftRight className="h-4 w-4" />
                  <Badge variant="outline">{targetEnv}</Badge>
                </div>
              </div>

              <Button
                onClick={runSync}
                disabled={isRunning || sourceEnv === targetEnv}
                className="w-full"
                size="lg"
                variant={syncDirection === 'push' ? 'destructive' : 'default'}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing database...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {syncDirection === 'pull' ? 'Pull' : 'Push'} Database
                  </>
                )}
              </Button>

              {sourceEnv === targetEnv && (
                <p className="text-center text-sm text-red-500">
                  Source and target cannot be the same
                </p>
              )}

              <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Terminal className="h-4 w-4" />
                  <span>Command:</span>
                </div>
                <div className="mt-2">
                  $ nself db sync --{syncDirection} --from={sourceEnv} --to=
                  {targetEnv}
                </div>
              </div>
            </CardContent>
          </Card>

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

        <Card>
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>History of sync operations from this session</CardDescription>
          </CardHeader>
          <CardContent>
            {syncResults.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">No sync operations performed yet</div>
            ) : (
              <div className="space-y-3">
                {syncResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <ArrowLeftRight className="h-4 w-4" />
                          {result.direction || 'Database Sync'}
                        </div>
                        <div className="text-sm text-zinc-500">{result.timestamp}</div>
                      </div>
                    </div>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Completed' : 'Error'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DatabaseSyncPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DatabaseSyncContent />
    </Suspense>
  )
}
