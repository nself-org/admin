'use client'

import { PageShell } from '@/components/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Download,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Server,
  Settings,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatabaseStats {
  version: string
  uptime: string
  status: 'healthy' | 'warning' | 'error'
  databases: number
  tables: number
  size: string
  connections: {
    active: number
    idle: number
    max: number
  }
  performance: {
    hitRatio: number
    cacheSize: string
    qps: number
    avgQueryTime: number
  }
}

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  executionTime: number
  error?: string
}

interface TableInfo {
  name: string
  schema: string
  rows: number
  size: string
  indexes: number
}

interface BackupEntry {
  id: string
  filename: string
  size: string
  timestamp: string
  status: 'completed' | 'failed' | 'in_progress'
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PostgreSQLPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [executing, setExecuting] = useState(false)
  const [selectedDatabase, setSelectedDatabase] = useState('postgres')
  const [tables, setTables] = useState<TableInfo[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [slowQueries, setSlowQueries] = useState<any[]>([])
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)

  useEffect(() => {
    fetchDatabaseStats()
    fetchTables()
    fetchSlowQueries()
    fetchBackups()
  }, [])

  const fetchDatabaseStats = async () => {
    try {
      setStats({
        version: 'PostgreSQL 15.3',
        uptime: '7 days 14:23:45',
        status: 'healthy',
        databases: 5,
        tables: 47,
        size: '1.2 GB',
        connections: { active: 8, idle: 4, max: 100 },
        performance: {
          hitRatio: 98.7,
          cacheSize: '256 MB',
          qps: 150,
          avgQueryTime: 2.5,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTables = async () => {
    setTables([
      {
        name: 'users',
        schema: 'public',
        rows: 15234,
        size: '12.5 MB',
        indexes: 3,
      },
      {
        name: 'sessions',
        schema: 'public',
        rows: 45821,
        size: '35.2 MB',
        indexes: 2,
      },
    ])
  }

  const fetchSlowQueries = async () => {
    setSlowQueries([
      {
        query: 'SELECT * FROM users WHERE email LIKE "%@example.com"',
        duration: '2.3s',
        calls: 152,
      },
    ])
  }

  const fetchBackups = async () => {
    setBackups([
      {
        id: '1',
        filename: 'backup_2024-01-20_14-30.sql.gz',
        size: '245 MB',
        timestamp: '2024-01-20 14:30:00',
        status: 'completed',
      },
    ])
  }

  const executeQuery = async () => {
    if (!query.trim()) return
    setExecuting(true)
    setQueryResult(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setQueryResult({
        columns: ['id', 'name', 'email'],
        rows: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        ],
        rowCount: 2,
        executionTime: 0.023,
      })
    } catch (error) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: 'Query execution failed',
      })
    } finally {
      setExecuting(false)
    }
  }

  const createBackup = async () => {
    setCreatingBackup(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await fetchBackups()
    setCreatingBackup(false)
  }

  if (loading) {
    return (
      <PageShell title="PostgreSQL" loading={true}>
        <div />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="PostgreSQL"
      description="Database management, query console, and performance metrics"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDatabaseStats}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
          <Button variant="outline" size="sm">
            <Terminal className="mr-2 h-4 w-4" />
            psql
          </Button>
        </div>
      }
    >
      {/* Stats Overview */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Connections
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.connections.active}/{stats.connections.max}
                  </p>
                  <Progress
                    value={
                      (stats.connections.active / stats.connections.max) * 100
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Cache Hit Ratio
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.performance.hitRatio}%
                  </p>
                  <Progress
                    value={stats.performance.hitRatio}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-sky-100 p-2 dark:bg-sky-900/30">
                  <HardDrive className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Database Size
                  </p>
                  <p className="text-2xl font-bold">{stats.size}</p>
                  <p className="text-xs text-zinc-500">{stats.tables} tables</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                  <Server className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-lg font-bold capitalize">
                      {stats.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="query">Query Console</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Connection Information
              </CardTitle>
              <CardDescription>
                Database connection details and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Version</p>
                  <p className="font-medium">{stats?.version}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Uptime</p>
                  <p className="font-medium">{stats?.uptime}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Host</p>
                  <p className="font-mono text-sm">localhost:5432</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Database</p>
                  <p className="font-mono text-sm">{selectedDatabase}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Tables
              </CardTitle>
              <CardDescription>
                Tables in {selectedDatabase} database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-zinc-400" />
                      <div>
                        <p className="font-medium">
                          {table.schema}.{table.name}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {table.rows.toLocaleString()} rows • {table.size}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{table.indexes} indexes</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Query Console Tab */}
        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SQL Query Console</CardTitle>
                <Select
                  value={selectedDatabase}
                  onValueChange={setSelectedDatabase}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">postgres</SelectItem>
                    <SelectItem value="hasura">hasura</SelectItem>
                    <SelectItem value="auth">auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter SQL query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[150px] font-mono"
              />

              <div className="flex gap-2">
                <Button onClick={executeQuery} disabled={executing}>
                  {executing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Execute
                </Button>
                <Button variant="outline" onClick={() => setQuery('')}>
                  Clear
                </Button>
                <Button variant="outline">
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>

              {queryResult && (
                <div className="space-y-4">
                  {queryResult.error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Query Error
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-red-700">
                        {queryResult.error}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Clock className="h-4 w-4" />
                          {queryResult.rowCount} rows •{' '}
                          {queryResult.executionTime}s
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>

                      <ScrollArea className="h-96 rounded-lg border">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
                            <tr className="border-b">
                              {queryResult.columns.map((col) => (
                                <th
                                  key={col}
                                  className="p-2 text-left text-sm font-medium"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.rows.map((row, i) => (
                              <tr
                                key={i}
                                className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                              >
                                {queryResult.columns.map((col) => (
                                  <td
                                    key={col}
                                    className="p-2 font-mono text-sm"
                                  >
                                    {row[col]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Slow Queries
              </CardTitle>
              <CardDescription>
                Queries taking longer than 1 second
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {slowQueries.map((q, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <pre className="mb-2 overflow-x-auto font-mono text-sm">
                      {q.query}
                    </pre>
                    <div className="flex gap-4 text-sm text-zinc-500">
                      <span>Duration: {q.duration}</span>
                      <span>Calls: {q.calls}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Database Backups
                  </CardTitle>
                  <CardDescription>
                    Manage database backups and restore points
                  </CardDescription>
                </div>
                <Button onClick={createBackup} disabled={creatingBackup}>
                  {creatingBackup ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Create Backup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-4 w-4 text-zinc-400" />
                      <div>
                        <p className="font-mono text-sm">{backup.filename}</p>
                        <p className="text-xs text-zinc-500">
                          {backup.timestamp} • {backup.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          backup.status === 'completed'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {backup.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                PostgreSQL Configuration
              </CardTitle>
              <CardDescription>
                View database configuration (read-only for safety)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <pre className="overflow-x-auto text-sm">{`# PostgreSQL Configuration
max_connections = 100
shared_buffers = 128MB
effective_cache_size = 4GB
work_mem = 4MB`}</pre>
              </div>
              <p className="mt-3 text-sm text-zinc-500">
                Configuration is read-only. Use <code>nself db config</code> to
                modify settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
