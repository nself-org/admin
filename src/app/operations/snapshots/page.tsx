'use client'

import { PageShell } from '@/components/PageShell'
import { TableSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, Database, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface Snapshot {
  id: string
  name: string
  size: string
  created: string
  status: string
}

function parseSnapshots(stdout: string): Snapshot[] {
  if (!stdout.trim()) return []
  try {
    const parsed = JSON.parse(stdout)
    if (Array.isArray(parsed)) return parsed as Snapshot[]
    return []
  } catch {
    // Try to parse line-based output like: "backup-20240101  2.4GB  2024-01-01T10:00:00Z  ok"
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

function SnapshotsContent() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchSnapshots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'backup', args: ['list'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to fetch snapshots')
        return
      }
      const raw = json.data?.stdout || ''
      setOutput(raw)
      setSnapshots(parseSnapshots(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSnapshots()
  }, [fetchSnapshots])

  const createSnapshot = async () => {
    setActionInProgress(true)
    setActionSuccess(false)
    setActionError(null)
    try {
      const res = await fetch('/api/nself', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'backup', args: ['create'] }),
      })
      const json = await res.json()
      if (!json.success) {
        setActionError(json.error || json.details || 'Failed to create snapshot')
      } else {
        setActionSuccess(true)
        await fetchSnapshots()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <PageShell title="Snapshots" description="Manage nSelf stack backups and snapshots.">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchSnapshots()}
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
            onClick={() => void createSnapshot()}
            disabled={actionInProgress || loading}
            className="gap-2"
          >
            {actionInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {actionInProgress ? 'Creating…' : 'Create Snapshot'}
          </Button>
          {actionSuccess && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" /> Snapshot created
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
                  <p className="font-medium">Failed to load snapshots</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && snapshots.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-center">
              No snapshots found. Create one to get started.
            </CardContent>
          </Card>
        )}

        {!loading && !error && snapshots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Snapshots ({snapshots.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snap) => (
                    <TableRow key={snap.id}>
                      <TableCell className="font-mono text-sm">{snap.name}</TableCell>
                      <TableCell>{snap.size}</TableCell>
                      <TableCell>{snap.created}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            snap.status === 'ok' || snap.status === 'complete'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {snap.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {output && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground font-mono text-sm">
                nself backup list
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

export default function SnapshotsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <SnapshotsContent />
    </Suspense>
  )
}
