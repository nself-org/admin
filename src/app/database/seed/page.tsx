'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import type { Seed } from '@/types/database'
import {
  CheckCircle,
  Clock,
  Database,
  FileCode,
  Folder,
  Loader2,
  Play,
  RefreshCw,
  Sprout,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface SeedResult {
  success: boolean
  output?: string
  error?: string
  timestamp: string
  type?: string
}

function DatabaseSeedContent() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingSeeds, setIsLoadingSeeds] = useState(true)
  const [forceMode, setForceMode] = useState(false)
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [seedResults, setSeedResults] = useState<SeedResult[]>([])
  const [lastOutput, setLastOutput] = useState<string>('')

  const commonSeeds = seeds.filter((s) => s.type === 'common')
  const localSeeds = seeds.filter((s) => s.type === 'local')
  const stagingSeeds = seeds.filter((s) => s.type === 'staging')
  const productionSeeds = seeds.filter((s) => s.type === 'production')

  const appliedCount = seeds.filter((s) => s.status === 'applied').length
  const availableCount = seeds.filter((s) => s.status === 'available').length

  /**
   * Fetch available seed files
   */
  const fetchSeeds = useCallback(async () => {
    setIsLoadingSeeds(true)
    try {
      const response = await fetch('/api/database/seed', {
        cache: 'no-store',
      })
      if (!response.ok) {
        setSeeds([])
        return
      }
      const data = await response.json()
      setSeeds(Array.isArray(data.data) ? data.data : [])
    } catch {
      setSeeds([])
    } finally {
      setIsLoadingSeeds(false)
    }
  }, [])

  useEffect(() => {
    fetchSeeds()
  }, [fetchSeeds])

  /**
   * Execute nself db seed via the CLI API
   */
  const runSeed = async (seedType?: string) => {
    setIsSeeding(true)
    setLastOutput('')

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seed',
          options: {
            force: forceMode,
            type: seedType,
          },
        }),
      })

      const data = await response.json()

      const result: SeedResult = {
        success: data.success,
        output: data.data?.output || data.details,
        error: data.error,
        timestamp: new Date().toLocaleString(),
        type: seedType || 'all',
      }

      setSeedResults((prev) => [result, ...prev.slice(0, 9)])
      setLastOutput(data.data?.output || data.details || '')

      if (data.success) {
        await fetchSeeds()
      }
    } catch (error) {
      const result: SeedResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Seed failed',
        timestamp: new Date().toLocaleString(),
        type: seedType || 'all',
      }
      setSeedResults((prev) => [result, ...prev.slice(0, 9)])
    } finally {
      setIsSeeding(false)
    }
  }

  /**
   * Execute nself db sync to sync Hasura metadata
   */
  const runSync = async () => {
    setIsSyncing(true)
    setLastOutput('')

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })

      const data = await response.json()

      const result: SeedResult = {
        success: data.success,
        output: data.data?.output || data.details,
        error: data.error,
        timestamp: new Date().toLocaleString(),
        type: 'sync',
      }

      setSeedResults((prev) => [result, ...prev.slice(0, 9)])
      setLastOutput(data.data?.output || data.details || '')
    } catch (error) {
      const result: SeedResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date().toLocaleString(),
        type: 'sync',
      }
      setSeedResults((prev) => [result, ...prev.slice(0, 9)])
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'available':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'available':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'common':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'local':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'staging':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'production':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
    }
  }

  const renderSeedList = (seedList: Seed[], title: string, type: string) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="outline" className={getTypeColor(type)}>
              {seedList.length}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSeed(type)}
            disabled={isSeeding || seedList.length === 0}
          >
            {isSeeding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run {title}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {seedList.length === 0 ? (
          <div className="py-4 text-center text-sm text-zinc-500">
            No {title.toLowerCase()} seeds found
          </div>
        ) : (
          <div className="space-y-2">
            {seedList.map((seed) => (
              <div
                key={seed.name}
                className="flex items-center justify-between rounded-lg border p-3 dark:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${getStatusColor(seed.status)}`}
                  >
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {seed.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {seed.recordCount} records
                      {seed.appliedAt &&
                        ` - Applied ${new Date(seed.appliedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(seed.status)} flex items-center gap-1`}
                >
                  {getStatusIcon(seed.status)}
                  {seed.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Database Seeding
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Seed your database with initial data using{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            nself db seed
          </code>
        </p>
      </div>
      <div className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>nself CLI Integration</AlertTitle>
          <AlertDescription>
            This page executes{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              nself db seed
            </code>{' '}
            to populate your database. Seed files are managed in your
            project&apos;s seed directory, organized by environment.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Total Seeds
                  </p>
                  <p className="mt-1 text-2xl font-bold">{seeds.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Sprout className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Applied</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-500">
                    {appliedCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Available</p>
                  <p className="mt-1 text-2xl font-bold text-blue-500">
                    {availableCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Total Records
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {seeds.reduce((acc, s) => acc + (s.recordCount || 0), 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                  <Database className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Seed Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                <CardTitle>Seed Controls</CardTitle>
              </div>
              <CardDescription>
                Run seeds to populate your database with data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Force Mode Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700">
                <div>
                  <p className="text-sm font-medium">Force Mode</p>
                  <p className="text-xs text-zinc-500">
                    Clear existing data before seeding (--force flag)
                  </p>
                </div>
                <Switch checked={forceMode} onCheckedChange={setForceMode} />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => runSeed()}
                  disabled={isSeeding}
                  className="w-full"
                  size="lg"
                >
                  {isSeeding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run All Seeds
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={runSync}
                  disabled={isSyncing}
                  className="w-full"
                  size="lg"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Metadata
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={fetchSeeds}
                disabled={isLoadingSeeds}
                className="w-full"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoadingSeeds ? 'animate-spin' : ''}`}
                />
                Refresh Seed List
              </Button>

              {/* CLI Command Preview */}
              <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Terminal className="h-4 w-4" />
                  <span>Command:</span>
                </div>
                <div className="mt-2">
                  $ nself db seed{forceMode ? ' --force' : ''}
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
                    Run a command to see output here
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Seed Files by Type */}
        <div className="grid gap-6 md:grid-cols-2">
          {renderSeedList(commonSeeds, 'Common Seeds', 'common')}
          {renderSeedList(localSeeds, 'Local Seeds', 'local')}
          {renderSeedList(stagingSeeds, 'Staging Seeds', 'staging')}
          {renderSeedList(productionSeeds, 'Production Seeds', 'production')}
        </div>

        {/* History */}
        {seedResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
              <CardDescription>
                History of seed operations from this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seedResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          {result.type === 'sync' ? (
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Sprout className="h-4 w-4 text-green-600" />
                          )}
                          {result.type === 'sync'
                            ? 'Hasura Sync'
                            : result.type === 'all'
                              ? 'All Seeds'
                              : `${result.type} Seeds`}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {result.timestamp}
                        </div>
                      </div>
                    </div>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Completed' : 'Error'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function DatabaseSeedPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DatabaseSeedContent />
    </Suspense>
  )
}
