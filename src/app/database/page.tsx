'use client'

import { ListSkeleton } from '@/components/skeletons'
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
import type { Backup, DatabaseStatus, Migration } from '@/types/database'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Database,
  Download,
  GitBranch,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Table2,
  Upload,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = 'blue',
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; positive: boolean }
  color?: 'blue' | 'emerald' | 'amber' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {title}
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {value}
            </p>
            {description && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            )}
            {trend && (
              <p
                className={`mt-1 text-xs ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {trend.positive ? '+' : ''}
                {trend.value}% from last week
              </p>
            )}
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectionStatus({ status }: { status?: DatabaseStatus }) {
  if (!status) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              status.connected
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${status.connected ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`}
            />
            {status.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Version</p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
              {status.version || 'Unknown'}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Uptime</p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
              {status.uptime || 'Unknown'}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Active Connections
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
              {status.connections?.active || 0} /{' '}
              {status.connections?.max || 100}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Idle Connections
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
              {status.connections?.idle || 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentBackups({ backups }: { backups?: Backup[] }) {
  const recentBackups = backups?.slice(0, 5) || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Recent Backups
            </CardTitle>
            <CardDescription>Latest database backups</CardDescription>
          </div>
          <Link href="/database/backup">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentBackups.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Download className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No backups found</p>
            <Link href="/database/backup">
              <Button variant="link" className="mt-2">
                Create your first backup
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between rounded-lg border p-3 dark:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      backup.type === 'full'
                        ? 'bg-blue-500/10 text-blue-500'
                        : backup.type === 'data'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {backup.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(backup.createdAt).toLocaleDateString()} -{' '}
                      {backup.size}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {backup.type}
                  {backup.compressed && ' (gz)'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MigrationStatus({ migrations }: { migrations?: Migration[] }) {
  const pendingCount =
    migrations?.filter((m) => m.status === 'pending').length || 0
  const appliedCount =
    migrations?.filter((m) => m.status === 'applied').length || 0
  const lastMigration = migrations?.find((m) => m.status === 'applied')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5" />
              Migration Status
            </CardTitle>
            <CardDescription>Database schema migrations</CardDescription>
          </div>
          <Link href="/database/migrations">
            <Button variant="outline" size="sm">
              Manage
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Applied
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {appliedCount}
              </p>
            </div>
            <div
              className={`rounded-lg p-4 ${pendingCount > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-zinc-50 dark:bg-zinc-800/50'}`}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={`h-5 w-5 ${pendingCount > 0 ? 'text-amber-600' : 'text-zinc-400'}`}
                />
                <span
                  className={`text-sm font-medium ${pendingCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-500'}`}
                >
                  Pending
                </span>
              </div>
              <p
                className={`mt-1 text-2xl font-bold ${pendingCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-500'}`}
              >
                {pendingCount}
              </p>
            </div>
          </div>

          {pendingCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Pending Migrations</AlertTitle>
              <AlertDescription>
                You have {pendingCount} pending migration
                {pendingCount > 1 ? 's' : ''}. Run them to update your database
                schema.
              </AlertDescription>
            </Alert>
          )}

          {lastMigration && (
            <div className="rounded-lg border p-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-500">Last Applied</p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
                {lastMigration.name}
              </p>
              <p className="text-xs text-zinc-500">
                {lastMigration.appliedAt
                  ? new Date(lastMigration.appliedAt).toLocaleString()
                  : 'Unknown date'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActions({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common database operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/database/backup">
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Create Backup
            </Button>
          </Link>
          <Link href="/database/restore">
            <Button variant="outline" className="w-full justify-start">
              <Upload className="mr-2 h-4 w-4" />
              Restore Database
            </Button>
          </Link>
          <Link href="/database/sync">
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Metadata
            </Button>
          </Link>
          <Link href="/database/migrations">
            <Button variant="outline" className="w-full justify-start">
              <Play className="mr-2 h-4 w-4" />
              Run Migrations
            </Button>
          </Link>
          <Link href="/database/sql">
            <Button variant="outline" className="w-full justify-start">
              <Database className="mr-2 h-4 w-4" />
              SQL Console
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onRefresh}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DatabaseContent() {
  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
    mutate: refreshStatus,
  } = useSWR('/api/database/status', fetcher, {
    refreshInterval: 10000,
  })

  const {
    data: backupData,
    error: backupError,
    isLoading: backupLoading,
  } = useSWR('/api/database/backup', fetcher, {
    refreshInterval: 30000,
  })

  const isLoading = statusLoading || backupLoading
  const hasError = statusError || backupError
  const status: DatabaseStatus | undefined = statusData?.data
  const backups: Backup[] | undefined = backupData?.data

  if (isLoading && !status) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Database</h1>
          <p className="text-muted-foreground">PostgreSQL database management and monitoring</p>
        </div>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="mb-6 h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg bg-zinc-200 dark:bg-zinc-800"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (hasError && !status) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Database</h1>
          <p className="text-muted-foreground">PostgreSQL database management and monitoring</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Failed to connect to the database. Please check your configuration
            and ensure PostgreSQL is running.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => refreshStatus()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Database</h1>
        <p className="text-muted-foreground">PostgreSQL database management and monitoring</p>
      </div>
      <div className="space-y-6">
        {/* Connection Status */}
        <ConnectionStatus status={status} />

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Database Size"
            value={status?.size || '0 MB'}
            description="Total storage used"
            icon={HardDrive}
            color="blue"
          />
          <StatCard
            title="Tables"
            value={status?.tables || 0}
            description="Active tables"
            icon={Table2}
            color="emerald"
          />
          <StatCard
            title="Connections"
            value={`${status?.connections?.active || 0} / ${status?.connections?.max || 100}`}
            description="Active / Maximum"
            icon={Users}
            color="amber"
          />
          <StatCard
            title="Backups"
            value={backups?.length || 0}
            description={
              backups?.[0]
                ? `Last: ${new Date(backups[0].createdAt).toLocaleDateString()}`
                : 'No recent backups'
            }
            icon={Download}
            color={backups && backups.length > 0 ? 'blue' : 'red'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentBackups backups={backups} />
          <MigrationStatus migrations={[]} />
        </div>

        {/* Quick Actions */}
        <QuickActions onRefresh={() => refreshStatus()} />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="fixed right-4 bottom-4 flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing...
          </div>
        )}
      </div>
    </div>
  )
}

export default function DatabasePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DatabaseContent />
    </Suspense>
  )
}
