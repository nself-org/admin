'use client'

import { TableSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Backup } from '@/types/database'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Database,
  FileArchive,
  Loader2,
  RefreshCw,
  RotateCcw,
  Shield,
  Terminal,
  Upload,
  XCircle,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function DatabaseRestoreContent() {
  const {
    data: backupData,
    error: backupError,
    isLoading: backupsLoading,
    mutate: refreshBackups,
  } = useSWR('/api/database/backup', fetcher, {
    refreshInterval: 30000,
  })

  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [customPath, setCustomPath] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [lastOutput, setLastOutput] = useState<string>('')
  const [restoreProgress, setRestoreProgress] = useState(0)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [currentEnvironment, setCurrentEnvironment] = useState<'local' | 'staging' | 'production'>(
    'local'
  )

  const backups: Backup[] = backupData?.data || []

  // Simulate environment detection (in real app, fetch from server)
  useEffect(() => {
    const env = process.env.NODE_ENV === 'production' ? 'production' : 'local'
    setCurrentEnvironment(env as 'local' | 'staging' | 'production')
  }, [])

  const isProductionEnvironment = currentEnvironment === 'production'
  const isStagingEnvironment = currentEnvironment === 'staging'
  const requiresConfirmation = isProductionEnvironment || isStagingEnvironment
  const confirmationPhrase = isProductionEnvironment
    ? 'restore production'
    : isStagingEnvironment
      ? 'restore staging'
      : ''
  const confirmationValid = !requiresConfirmation || confirmationInput === confirmationPhrase

  const runRestore = async () => {
    const backupPath = selectedBackup?.path || customPath.trim()
    if (!backupPath) {
      setLastOutput('Error: Please select a backup or enter a backup file path')
      return
    }

    if (requiresConfirmation && !confirmationValid) {
      setLastOutput(`Error: Please type "${confirmationPhrase}" to confirm the restore operation`)
      return
    }

    setIsRestoring(true)
    setLastOutput('')
    setRestoreProgress(0)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setRestoreProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 500)

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          options: { backupPath },
        }),
      })

      const data = await response.json()
      clearInterval(progressInterval)
      setRestoreProgress(100)
      setLastOutput(data.data?.output || data.details || JSON.stringify(data, null, 2))

      if (data.success) {
        setSelectedBackup(null)
        setCustomPath('')
        setConfirmationInput('')
      }
    } catch (error) {
      clearInterval(progressInterval)
      setRestoreProgress(0)
      setLastOutput(error instanceof Error ? error.message : 'Restore failed')
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'data':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'schema':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Restore Database</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Restore your database from a backup file using{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            nself db restore
          </code>
        </p>
      </div>
      <div className="space-y-6">
        {/* Production Warning */}
        {isProductionEnvironment && (
          <Alert variant="destructive" className="border-red-600 bg-red-950/50">
            <Shield className="h-5 w-5" />
            <AlertTitle className="text-lg">Production Environment Detected</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                You are about to restore a database in a <strong>PRODUCTION</strong> environment.
                This operation will:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>Permanently overwrite all existing production data</li>
                <li>Potentially cause downtime for all users</li>
                <li>Be irreversible without another backup</li>
              </ul>
              <p className="mt-2 font-semibold">
                Ensure you have a current backup before proceeding.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Staging Warning */}
        {isStagingEnvironment && (
          <Alert className="border-amber-600 bg-amber-950/50">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-amber-500">Staging Environment</AlertTitle>
            <AlertDescription className="text-amber-200">
              This is a staging environment. Restoring will overwrite all staging data. Type the
              confirmation phrase below to proceed.
            </AlertDescription>
          </Alert>
        )}

        {/* General Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: Destructive Operation</AlertTitle>
          <AlertDescription>
            Restoring a database will overwrite all existing data. Make sure you have a recent
            backup before proceeding.
          </AlertDescription>
        </Alert>

        {/* CLI Info */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>nself CLI Integration</AlertTitle>
          <AlertDescription>
            This page executes{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">nself db restore</code> to
            restore your database from a backup file.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Backup Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileArchive className="h-5 w-5 text-blue-600" />
                    Select Backup
                  </CardTitle>
                  <CardDescription>Choose a backup to restore from</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshBackups()}
                  disabled={backupsLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${backupsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {backupError ? (
                <div className="py-4 text-center">
                  <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                  <p className="text-zinc-500">Failed to load backups</p>
                </div>
              ) : backupsLoading && backups.length === 0 ? (
                <div className="py-4 text-center">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-zinc-400" />
                  <p className="text-zinc-500">Loading backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-4 text-center text-zinc-500">
                  <FileArchive className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No backups available</p>
                  <p className="mt-1 text-sm">Enter a custom path below</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {backups.map((backup) => {
                      const dateInfo = formatDate(backup.createdAt)
                      const isSelected = selectedBackup?.id === backup.id
                      return (
                        <div
                          key={backup.id}
                          onClick={() => {
                            setSelectedBackup(isSelected ? null : backup)
                            setCustomPath('')
                          }}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${getTypeColor(backup.type)}`}
                            >
                              <Database className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {backup.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span>{backup.size}</span>
                                <span>-</span>
                                <span>{dateInfo.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getTypeColor(backup.type)}>
                              {backup.type}
                            </Badge>
                            {isSelected && <CheckCircle className="h-5 w-5 text-blue-500" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t dark:border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900">
                    Or enter custom path
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-path">Custom Backup Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="backup-path"
                    placeholder="/backups/backup-2024-01-15.sql.gz"
                    value={customPath}
                    onChange={(e) => {
                      setCustomPath(e.target.value)
                      setSelectedBackup(null)
                    }}
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restore Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-600" />
                Restore Options
              </CardTitle>
              <CardDescription>Configure and execute the database restore</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Backup Info */}
              {selectedBackup && (
                <div className="rounded-lg border bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-sm font-medium text-zinc-500">Selected Backup</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Database className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {selectedBackup.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span>{selectedBackup.size}</span>
                        <span>-</span>
                        <span>{selectedBackup.type}</span>
                        <span>-</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(selectedBackup.createdAt).date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {customPath && (
                <div className="rounded-lg border bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-sm font-medium text-zinc-500">Custom Path</p>
                  <p className="mt-1 font-mono text-sm text-zinc-900 dark:text-white">
                    {customPath}
                  </p>
                </div>
              )}

              {/* Confirmation Input for Production/Staging */}
              {requiresConfirmation && (
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmation"
                    className={isProductionEnvironment ? 'text-red-500' : 'text-amber-500'}
                  >
                    Type &quot;{confirmationPhrase}&quot; to confirm
                  </Label>
                  <Input
                    id="confirmation"
                    placeholder={confirmationPhrase}
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    className={
                      confirmationValid && confirmationInput
                        ? 'border-green-500 focus:ring-green-500'
                        : isProductionEnvironment
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-amber-500 focus:ring-amber-500'
                    }
                  />
                  {confirmationValid && confirmationInput && (
                    <p className="flex items-center gap-1 text-sm text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      Confirmation accepted
                    </p>
                  )}
                </div>
              )}

              {/* Restore Progress */}
              {isRestoring && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Restoring database...</span>
                    <span className="font-medium">{Math.round(restoreProgress)}%</span>
                  </div>
                  <Progress value={restoreProgress} className="h-2" />
                </div>
              )}

              {/* Restore Button */}
              <Button
                onClick={runRestore}
                disabled={
                  isRestoring ||
                  (!selectedBackup && !customPath.trim()) ||
                  (requiresConfirmation && !confirmationValid)
                }
                className="w-full"
                size="lg"
                variant="destructive"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring database...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Database
                  </>
                )}
              </Button>

              {/* Command Preview */}
              <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Terminal className="h-4 w-4" />
                  <span>Command:</span>
                </div>
                <div className="mt-2">
                  $ nself db restore {selectedBackup?.path || customPath || '<backup-file>'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CLI Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 rounded-lg bg-zinc-950 p-4">
              {lastOutput ? (
                <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                  {lastOutput}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  Run a restore to see output here
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Success/Error Toast */}
        {lastOutput && restoreProgress === 100 && (
          <div
            className={`fixed right-4 bottom-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
              lastOutput.toLowerCase().includes('error') ||
              lastOutput.toLowerCase().includes('failed')
                ? 'bg-red-600'
                : 'bg-emerald-600'
            }`}
          >
            {lastOutput.toLowerCase().includes('error') ||
            lastOutput.toLowerCase().includes('failed') ? (
              <>
                <XCircle className="h-4 w-4" />
                Restore failed
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Database restored successfully
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DatabaseRestorePage() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="sr-only">Restore Database</h1>
          <TableSkeleton />
        </div>
      }
    >
      <DatabaseRestoreContent />
    </Suspense>
  )
}
