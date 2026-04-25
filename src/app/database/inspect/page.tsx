'use client'

import { PageTemplate } from '@/components/PageTemplate'
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
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUrlState } from '@/hooks/useUrlState'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Gauge,
  HardDrive,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Table2,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface TableSize {
  name: string
  schema: string
  rows: number
  totalSize: string
  dataSize: string
  indexSize: string
  toastSize: string
}

interface CacheStats {
  hitRatio: number
  heapHit: number
  heapRead: number
  indexHit: number
  indexRead: number
}

interface IndexUsage {
  name: string
  table: string
  scans: number
  rowsRead: number
  rowsFetched: number
  usage: 'high' | 'medium' | 'low' | 'unused'
}

interface SlowQuery {
  query: string
  calls: number
  totalTime: number
  meanTime: number
  rows: number
}

interface LockInfo {
  pid: number
  type: string
  mode: string
  granted: boolean
  relation: string
  duration: string
}

interface DatabaseOverview {
  size: string
  tableCount: number
  indexCount: number
  activeConnections: number
  maxConnections: number
  uptime: string
  version: string
  cacheHitRatio: number
}

function DatabaseInspectContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'overview')
  const [overview, setOverview] = useState<DatabaseOverview | null>(null)
  const [tableSizes, setTableSizes] = useState<TableSize[]>([])
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [indexUsage, setIndexUsage] = useState<IndexUsage[]>([])
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([])
  const [locks, setLocks] = useState<LockInfo[]>([])

  const fetchInspectData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Mock data - in real implementation, fetch from API
      setOverview({
        size: '256 MB',
        tableCount: 24,
        indexCount: 48,
        activeConnections: 8,
        maxConnections: 100,
        uptime: '14 days, 6 hours',
        version: 'PostgreSQL 16.1',
        cacheHitRatio: 98.7,
      })

      setTableSizes([
        {
          name: 'users',
          schema: 'public',
          rows: 15420,
          totalSize: '48 MB',
          dataSize: '32 MB',
          indexSize: '14 MB',
          toastSize: '2 MB',
        },
        {
          name: 'posts',
          schema: 'public',
          rows: 142850,
          totalSize: '96 MB',
          dataSize: '72 MB',
          indexSize: '18 MB',
          toastSize: '6 MB',
        },
        {
          name: 'comments',
          schema: 'public',
          rows: 523410,
          totalSize: '64 MB',
          dataSize: '48 MB',
          indexSize: '12 MB',
          toastSize: '4 MB',
        },
        {
          name: 'sessions',
          schema: 'public',
          rows: 8240,
          totalSize: '24 MB',
          dataSize: '16 MB',
          indexSize: '6 MB',
          toastSize: '2 MB',
        },
        {
          name: 'audit_logs',
          schema: 'public',
          rows: 1254680,
          totalSize: '18 MB',
          dataSize: '12 MB',
          indexSize: '4 MB',
          toastSize: '2 MB',
        },
      ])

      setCacheStats({
        hitRatio: 98.7,
        heapHit: 4582156,
        heapRead: 62450,
        indexHit: 1245890,
        indexRead: 8420,
      })

      setIndexUsage([
        {
          name: 'users_pkey',
          table: 'users',
          scans: 145820,
          rowsRead: 145820,
          rowsFetched: 145820,
          usage: 'high',
        },
        {
          name: 'users_email_idx',
          table: 'users',
          scans: 82450,
          rowsRead: 82450,
          rowsFetched: 82450,
          usage: 'high',
        },
        {
          name: 'posts_user_id_idx',
          table: 'posts',
          scans: 52180,
          rowsRead: 142850,
          rowsFetched: 52180,
          usage: 'medium',
        },
        {
          name: 'posts_created_at_idx',
          table: 'posts',
          scans: 12450,
          rowsRead: 142850,
          rowsFetched: 12450,
          usage: 'medium',
        },
        {
          name: 'comments_post_id_idx',
          table: 'comments',
          scans: 5240,
          rowsRead: 523410,
          rowsFetched: 5240,
          usage: 'low',
        },
        {
          name: 'old_legacy_idx',
          table: 'legacy_data',
          scans: 0,
          rowsRead: 0,
          rowsFetched: 0,
          usage: 'unused',
        },
      ])

      setSlowQueries([
        {
          query:
            'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
          calls: 12450,
          totalTime: 4520.5,
          meanTime: 0.36,
          rows: 1245000,
        },
        {
          query:
            'SELECT COUNT(*) FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = $1)',
          calls: 5240,
          totalTime: 2180.2,
          meanTime: 0.42,
          rows: 5240,
        },
        {
          query: 'UPDATE users SET last_login = NOW() WHERE id = $1',
          calls: 8240,
          totalTime: 824.0,
          meanTime: 0.1,
          rows: 8240,
        },
      ])

      setLocks([
        {
          pid: 12458,
          type: 'relation',
          mode: 'AccessShareLock',
          granted: true,
          relation: 'users',
          duration: '00:00:02',
        },
        {
          pid: 12459,
          type: 'relation',
          mode: 'RowExclusiveLock',
          granted: true,
          relation: 'posts',
          duration: '00:00:01',
        },
      ])
    } catch (error) {
      console.error('Failed to fetch inspect data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchInspectData()
  }, [fetchInspectData])

  const getUsageColor = (usage: string) => {
    switch (usage) {
      case 'high':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'medium':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'low':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'unused':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  if (isLoading) {
    return (
      <PageTemplate
        title="Database Inspector"
        description="Analyze and monitor your PostgreSQL database performance"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Database Inspector"
      description="Analyze and monitor your PostgreSQL database performance"
    >
      <div className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Database Inspection Tools</AlertTitle>
          <AlertDescription>
            Real-time analysis of your database performance, table sizes, cache
            efficiency, index usage, and active locks.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Table Sizes</span>
              </TabsTrigger>
              <TabsTrigger value="cache" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Cache</span>
              </TabsTrigger>
              <TabsTrigger value="indexes" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Indexes</span>
              </TabsTrigger>
              <TabsTrigger value="queries" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Slow Queries</span>
              </TabsTrigger>
              <TabsTrigger value="locks" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Locks</span>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchInspectData}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-500">
                        Database Size
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {overview?.size}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                      <HardDrive className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-500">
                        Tables / Indexes
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {overview?.tableCount} / {overview?.indexCount}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Table2 className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-500">
                        Connections
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {overview?.activeConnections} /{' '}
                        {overview?.maxConnections}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                      <Activity className="h-6 w-6 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-500">
                        Cache Hit Ratio
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-500">
                        {overview?.cacheHitRatio}%
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Zap className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Tables by Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tableSizes.slice(0, 5).map((table) => (
                      <div key={table.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{table.name}</span>
                          <span className="text-zinc-500">
                            {table.totalSize}
                          </span>
                        </div>
                        <Progress
                          value={
                            (parseInt(table.totalSize) /
                              Math.max(
                                ...tableSizes.map((t) => parseInt(t.totalSize)),
                              )) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <span className="text-sm text-zinc-500">Version</span>
                      <span className="text-sm font-medium">
                        {overview?.version}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <span className="text-sm text-zinc-500">Uptime</span>
                      <span className="text-sm font-medium">
                        {overview?.uptime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <span className="text-sm text-zinc-500">
                        Active Locks
                      </span>
                      <span className="text-sm font-medium">
                        {locks.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <span className="text-sm text-zinc-500">
                        Unused Indexes
                      </span>
                      <span className="text-sm font-medium text-amber-500">
                        {indexUsage.filter((i) => i.usage === 'unused').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Table Sizes Tab */}
          <TabsContent value="tables" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Table Sizes
                </CardTitle>
                <CardDescription>
                  Storage breakdown for each table in your database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-zinc-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                          Table
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Rows
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Total Size
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Data Size
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Index Size
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          TOAST Size
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-zinc-700">
                      {tableSizes.map((table) => (
                        <tr
                          key={table.name}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Table2 className="h-4 w-4 text-zinc-400" />
                              <span className="font-medium">
                                {table.schema}.{table.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatNumber(table.rows)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {table.totalSize}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-500">
                            {table.dataSize}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-500">
                            {table.indexSize}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-500">
                            {table.toastSize}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cache Tab */}
          <TabsContent value="cache" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Cache Hit Ratio
                  </CardTitle>
                  <CardDescription>
                    Higher is better. Aim for &gt;99% in production
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-6xl font-bold text-emerald-500">
                      {cacheStats?.hitRatio}%
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {cacheStats && cacheStats.hitRatio >= 99
                        ? 'Excellent cache performance'
                        : cacheStats && cacheStats.hitRatio >= 95
                          ? 'Good cache performance'
                          : 'Consider increasing shared_buffers'}
                    </p>
                    <Progress
                      value={cacheStats?.hitRatio || 0}
                      className="mt-4 h-3 w-full max-w-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Buffer Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                      <p className="text-sm font-medium">Heap (Table Data)</p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-emerald-500">
                          Hits: {formatNumber(cacheStats?.heapHit || 0)}
                        </span>
                        <span className="text-amber-500">
                          Reads: {formatNumber(cacheStats?.heapRead || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                      <p className="text-sm font-medium">Index Data</p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-emerald-500">
                          Hits: {formatNumber(cacheStats?.indexHit || 0)}
                        </span>
                        <span className="text-amber-500">
                          Reads: {formatNumber(cacheStats?.indexRead || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Index Usage Tab */}
          <TabsContent value="indexes" className="mt-6">
            {indexUsage.some((i) => i.usage === 'unused') && (
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Unused Indexes Detected</AlertTitle>
                <AlertDescription>
                  You have{' '}
                  {indexUsage.filter((i) => i.usage === 'unused').length} unused
                  indexes. Consider dropping them to improve write performance.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Index Usage Statistics
                </CardTitle>
                <CardDescription>
                  Monitor which indexes are being used and identify unused ones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-zinc-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                          Index
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                          Table
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Scans
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Rows Read
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Rows Fetched
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                          Usage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-zinc-700">
                      {indexUsage.map((index) => (
                        <tr
                          key={index.name}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm">
                              {index.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-500">
                            {index.table}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatNumber(index.scans)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatNumber(index.rowsRead)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatNumber(index.rowsFetched)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              variant="outline"
                              className={getUsageColor(index.usage)}
                            >
                              {index.usage}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Slow Queries Tab */}
          <TabsContent value="queries" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Slow Queries
                </CardTitle>
                <CardDescription>
                  Queries with the highest total execution time (requires
                  pg_stat_statements)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {slowQueries.map((query, index) => (
                      <div
                        key={index}
                        className="rounded-lg border p-4 dark:border-zinc-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <pre className="flex-1 overflow-x-auto rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                            {query.query}
                          </pre>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-zinc-500">Calls:</span>{' '}
                            <span className="font-medium">
                              {formatNumber(query.calls)}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Total Time:</span>{' '}
                            <span className="font-medium">
                              {query.totalTime.toFixed(2)} ms
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Mean Time:</span>{' '}
                            <span className="font-medium">
                              {query.meanTime.toFixed(2)} ms
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Rows:</span>{' '}
                            <span className="font-medium">
                              {formatNumber(query.rows)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locks Tab */}
          <TabsContent value="locks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Active Locks
                </CardTitle>
                <CardDescription>
                  Currently held and pending database locks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locks.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">
                    <Lock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No active locks</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b dark:border-zinc-700">
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                            PID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                            Mode
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                            Relation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                            Granted
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-zinc-700">
                        {locks.map((lock) => (
                          <tr
                            key={lock.pid}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          >
                            <td className="px-4 py-3 font-mono text-sm">
                              {lock.pid}
                            </td>
                            <td className="px-4 py-3 text-sm">{lock.type}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{lock.mode}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {lock.relation}
                            </td>
                            <td className="px-4 py-3">
                              {lock.granted ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-500"
                                >
                                  Yes
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-red-500/10 text-red-500"
                                >
                                  Waiting
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-sm">
                              {lock.duration}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTemplate>
  )
}

export default function DatabaseInspectPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DatabaseInspectContent />
    </Suspense>
  )
}
