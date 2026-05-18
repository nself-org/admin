'use client'

import { PageShell } from '@/components/PageShell'
import { TableSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Database, Download, Loader2, RefreshCw, Upload, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface BackupEntry {
  id: string
  name: string
  size: string
  created: string
  status: string
}

function parseBackups(stdout: string): BackupEntry[] {
  if (!stdout.trim()) return []
  try {
    const parsed = JSON.parse(stdout)
    if (Array.isArray(parsed)) return parsed as BackupEntry[]
    return []
  } catch {
    const lines = stdout.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    return lines.map((line, i) => {
      const parts = line.trim().split(/\s+/)
      return {
        id: String(i),
        name: parts[0] ?? line,
        size: parts[1] ?? '—',
        created: parts[2] ?? '—',
        status: parts[3] ?? 'unknown',
      }
    })
  }
}

function DataContent() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportInProgress, setExportInProgress] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importInProgress, setImportInProgress] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState('')

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself backup list')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'backup', args: ['list'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch backup list')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setBackups(parseBackups(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchBackups()
  }, [fetchBackups])

  const runExport = async () => {
    setExportInProgress(true)
    setExportSuccess(false)
    setExportError(null)
    setLastCommand('nself backup create')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'backup', args: ['create'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setExportError(json.error || json.details || 'Export failed')
      } else {
        setExportSuccess(true)
        setOutput(json.data?.stdout || '')
        await fetchBackups()
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setExportInProgress(false)
    }
  }

  const runRestore = async () => {
    setImportInProgress(true)
    setImportSuccess(false)
    setImportError(null)
    setLastCommand('nself restore')
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'restore', args: [] }),
      })
      const json = await res.json()
      if (!json.success) {
        setImportError(json.error || json.details || 'Restore failed')
      } else {
        setImportSuccess(true)
        setOutput(json.data?.stdout || '')
        await fetchBackups()
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setImportInProgress(false)
    }
  }

  return (
    <PageShell title="Data" description="Export and restore nSelf stack data backups.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchBackups()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => void runExport()}
            disabled={exportInProgress || importInProgress || loading}
            className="gap-2"
          >
            {exportInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportInProgress ? 'Exporting…' : 'Export Backup'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void runRestore()}
            disabled={importInProgress || exportInProgress || loading}
            className="gap-2"
          >
            {importInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importInProgress ? 'Restoring…' : 'Restore'}
          </Button>
          {exportSuccess && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" /> Backup exported
            </Badge>
          )}
          {exportError && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> {exportError}
            </Badge>
          )}
          {importSuccess && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" /> Restore complete
            </Badge>
          )}
          {importError && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> {importError}
            </Badge>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-start gap-2">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Failed to load backups</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && backups.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No backups found. Create one to get started.
            </CardContent>
          </Card>
        )}

        {!loading && !error && backups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backups ({backups.length})
              </CardTitle>
              <CardDescription>Available backup snapshots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {backups.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-mono text-sm">{b.name}</p>
                      <p className="text-muted-foreground text-xs">{b.created}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm">{b.size}</span>
                      <Badge
                        variant={
                          b.status === 'ok' || b.status === 'complete' ? 'default' : 'secondary'
                        }
                      >
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

export default function DataPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DataContent />
    </Suspense>
  )
}
