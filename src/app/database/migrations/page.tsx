'use client'

import { TableSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import type { Migration } from '@/types/database'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  FileCode,
  GitBranch,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface MigrationResult {
  success: boolean
  output?: string
  error?: string
  timestamp: string
  direction?: 'up' | 'down'
}

function DatabaseMigrationsContent() {
  const [isRunning, setIsRunning] = useState(false)
  const [isFreshRunning, setIsFreshRunning] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([])
  const [lastOutput, setLastOutput] = useState<string>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showFreshDialog, setShowFreshDialog] = useState(false)
  const [newMigrationName, setNewMigrationName] = useState('')
  const [newMigrationSql, setNewMigrationSql] = useState('')
  const [freshConfirmation, setFreshConfirmation] = useState('')
  const [isDevelopment, setIsDevelopment] = useState(true)

  const pendingCount = migrations.filter((m) => m.status === 'pending').length
  const appliedCount = migrations.filter((m) => m.status === 'applied').length
  const failedCount = migrations.filter((m) => m.status === 'failed').length

  // Detect development mode
  useEffect(() => {
    const isDev = process.env.NODE_ENV !== 'production'
    setIsDevelopment(isDev)
  }, [])

  /**
   * Fetch current migration list from /api/database/migrations (GET).
   * Calls nself CLI under the hood — no mock data (ADM-T07).
   */
  const fetchMigrationStatus = useCallback(async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch('/api/database/migrations', {
        cache: 'no-store',
      })

      if (response.status === 401) {
        // Unauthenticated — middleware will redirect, but handle gracefully
        setLastOutput('Authentication required. Please log in.')
        setMigrations([])
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setLastOutput(data.details || data.error || `Error ${response.status}`)
        setMigrations([])
        return
      }

      const fetched: Migration[] = Array.isArray(data.data) ? data.data : []
      setMigrations(fetched)
      setLastOutput(fetched.length === 0 ? '' : `Loaded ${fetched.length} migration(s)`)
    } catch (error) {
      // Offline / Docker down
      setLastOutput(error instanceof Error ? error.message : 'Could not reach the admin API')
      setMigrations([])
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    fetchMigrationStatus()
  }, [fetchMigrationStatus])

  /**
   * Execute nself db migrate via the CLI API
   */
  const runMigrate = async (direction: 'up' | 'down' = 'up', steps?: number) => {
    setIsRunning(true)
    setLastOutput('')

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          options: {
            direction,
            steps,
          },
        }),
      })

      const data = await response.json()

      const result: MigrationResult = {
        success: data.success,
        output: data.data?.output || data.details,
        error: data.error,
        timestamp: new Date().toLocaleString(),
        direction,
      }

      setMigrationResults((prev) => [result, ...prev.slice(0, 9)])
      setLastOutput(data.data?.output || data.details || '')

      // Refresh status after migration
      await fetchMigrationStatus()
    } catch (error) {
      const result: MigrationResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
        timestamp: new Date().toLocaleString(),
        direction,
      }
      setMigrationResults((prev) => [result, ...prev.slice(0, 9)])
    } finally {
      setIsRunning(false)
    }
  }

  /**
   * Run fresh migration (drop all and re-run)
   */
  const runFreshMigration = async () => {
    if (freshConfirmation !== 'fresh migrate') {
      setLastOutput('Error: Please type "fresh migrate" to confirm')
      return
    }

    setIsFreshRunning(true)
    setLastOutput('')
    setShowFreshDialog(false)
    setFreshConfirmation('')

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          options: { fresh: true },
        }),
      })

      const data = await response.json()

      const result: MigrationResult = {
        success: data.success,
        output: data.data?.output || data.details,
        error: data.error,
        timestamp: new Date().toLocaleString(),
      }

      setMigrationResults((prev) => [result, ...prev.slice(0, 9)])
      setLastOutput(data.data?.output || data.details || '')

      await fetchMigrationStatus()
    } catch (error) {
      setLastOutput(error instanceof Error ? error.message : 'Fresh migration failed')
    } finally {
      setIsFreshRunning(false)
    }
  }

  /**
   * Create a new migration file
   */
  const createMigration = async () => {
    if (!newMigrationName.trim()) {
      return
    }

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate:create',
          options: {
            name: newMigrationName,
            sql: newMigrationSql,
          },
        }),
      })

      const data = await response.json()
      setLastOutput(data.data?.output || data.details || '')

      if (data.success) {
        setShowCreateDialog(false)
        setNewMigrationName('')
        setNewMigrationSql('')
        await fetchMigrationStatus()
      }
    } catch (error) {
      setLastOutput(error instanceof Error ? error.message : 'Failed to create migration')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
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
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Database Migrations</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Run and manage database schema migrations using{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            nself db migrate
          </code>
        </p>
      </div>
      <div className="space-y-6">
        {/* CLI Info */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>nself CLI Integration</AlertTitle>
          <AlertDescription>
            This page executes{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">nself db migrate</code> to
            manage your database schema migrations.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Applied</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-500">{appliedCount}</p>
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
                  <p className="text-sm font-medium text-zinc-500">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-500">{pendingCount}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Failed</p>
                  <p className="mt-1 text-2xl font-bold text-red-500">{failedCount}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Total</p>
                  <p className="mt-1 text-2xl font-bold">{migrations.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <GitBranch className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Warning */}
        {pendingCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Pending Migrations</AlertTitle>
            <AlertDescription>
              You have {pendingCount} pending migration
              {pendingCount > 1 ? 's' : ''}. Run them to update your database schema.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Migration Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-blue-600" />
                <CardTitle>Migration Controls</CardTitle>
              </div>
              <CardDescription>Run, rollback, or create new migrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => runMigrate('up')}
                  disabled={isRunning || pendingCount === 0}
                  className="w-full"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run All Pending
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => runMigrate('down', 1)}
                  disabled={isRunning || appliedCount === 0}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rolling back...
                    </>
                  ) : (
                    <>
                      <ArrowDown className="mr-2 h-4 w-4" />
                      Rollback Last
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Create Migration Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Migration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Migration</DialogTitle>
                      <DialogDescription>
                        Create a new migration file with SQL statements
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="migration-name">Migration Name</Label>
                        <Input
                          id="migration-name"
                          placeholder="add_posts_table"
                          value={newMigrationName}
                          onChange={(e) => setNewMigrationName(e.target.value)}
                        />
                        <p className="text-xs text-zinc-500">
                          Use snake_case, no spaces or special characters
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="migration-sql">SQL (optional)</Label>
                        <Textarea
                          id="migration-sql"
                          placeholder="CREATE TABLE posts (...);"
                          value={newMigrationSql}
                          onChange={(e) => setNewMigrationSql(e.target.value)}
                          className="min-h-32 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createMigration} disabled={!newMigrationName.trim()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={fetchMigrationStatus}
                  disabled={isLoadingStatus}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>

              {/* Fresh Migration (Dev Only) */}
              {isDevelopment && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t dark:border-zinc-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900">
                        Danger Zone
                      </span>
                    </div>
                  </div>

                  <Dialog open={showFreshDialog} onOpenChange={setShowFreshDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Fresh Migration (Drop All)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                          <AlertTriangle className="h-5 w-5" />
                          Fresh Migration Warning
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                          This will <strong>DROP ALL TABLES</strong> and re-run all migrations from
                          scratch. All data will be permanently lost.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>This action cannot be undone</AlertTitle>
                          <AlertDescription>
                            Make sure you have a backup before proceeding.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="fresh-confirm" className="text-red-500">
                            Type &quot;fresh migrate&quot; to confirm
                          </Label>
                          <Input
                            id="fresh-confirm"
                            placeholder="fresh migrate"
                            value={freshConfirmation}
                            onChange={(e) => setFreshConfirmation(e.target.value)}
                            className="border-red-500"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowFreshDialog(false)
                            setFreshConfirmation('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={runFreshMigration}
                          disabled={freshConfirmation !== 'fresh migrate' || isFreshRunning}
                        >
                          {isFreshRunning ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Fresh Migrate
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Command Preview */}
              <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Terminal className="h-4 w-4" />
                  <span>Command:</span>
                </div>
                <div className="mt-2">$ nself db migrate</div>
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
                    Run a migration to see output here
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Migration Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Migration Files
            </CardTitle>
            <CardDescription>All migration files in your project</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatus && migrations.length === 0 ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-zinc-400" />
                <p className="text-zinc-500">Loading migrations...</p>
              </div>
            ) : migrations.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <GitBranch className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No migrations found</p>
                <p className="mt-1 text-sm">Create your first migration above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-zinc-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                        Migration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                        Batch
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                        Applied At
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-700">
                    {migrations.map((migration) => (
                      <tr key={migration.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${getStatusColor(migration.status)}`}
                            >
                              <FileCode className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {migration.name}
                              </p>
                              <p className="text-xs text-zinc-500">ID: {migration.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(migration.status)} flex w-fit items-center gap-1`}
                          >
                            {getStatusIcon(migration.status)}
                            {migration.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {migration.batch > 0 ? `Batch ${migration.batch}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {migration.appliedAt ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-zinc-400" />
                              <div>
                                <p className="text-sm text-zinc-900 dark:text-white">
                                  {new Date(migration.appliedAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {new Date(migration.appliedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {migration.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => runMigrate('up', 1)}
                                disabled={isRunning}
                              >
                                <ArrowUp className="h-4 w-4 text-emerald-500" />
                              </Button>
                            )}
                            {migration.status === 'applied' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => runMigrate('down', 1)}
                                disabled={isRunning}
                              >
                                <ArrowDown className="h-4 w-4 text-amber-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Migration History */}
        {migrationResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
              <CardDescription>History of migration operations from this session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {migrationResults.map((result, index) => (
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
                          {result.direction === 'up' ? (
                            <ArrowUp className="h-4 w-4 text-emerald-600" />
                          ) : result.direction === 'down' ? (
                            <ArrowDown className="h-4 w-4 text-amber-600" />
                          ) : (
                            <RotateCcw className="h-4 w-4 text-blue-600" />
                          )}
                          {result.direction === 'up'
                            ? 'Migrate Up'
                            : result.direction === 'down'
                              ? 'Rollback'
                              : 'Fresh Migrate'}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function DatabaseMigrationsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DatabaseMigrationsContent />
    </Suspense>
  )
}
