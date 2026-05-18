'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeyUsageStats } from '@/hooks/useApiKeys'
import type { ApiKeyUsageStats } from '@/types/api-key'
import { Activity, BarChart3, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react'

interface ApiKeyUsageChartProps {
  /** API key ID to show usage for */
  keyId: string
  /** Optional pre-loaded stats */
  stats?: ApiKeyUsageStats
  /** Whether to show the full dashboard or compact view */
  compact?: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-zinc-100 p-2 dark:bg-zinc-800">
          <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
        </div>
        {trend && (
          <TrendingUp
            className={`h-4 w-4 ${
              trend === 'up'
                ? 'text-green-500'
                : trend === 'down'
                  ? 'rotate-180 text-red-500'
                  : 'text-zinc-400'
            }`}
          />
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        {subValue && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{subValue}</p>}
      </div>
    </div>
  )
}

export function ApiKeyUsageChart({
  keyId,
  stats: preloadedStats,
  compact = false,
}: ApiKeyUsageChartProps) {
  const {
    stats: fetchedStats,
    isLoading,
    isError,
    error,
  } = useApiKeyUsageStats(preloadedStats ? undefined : keyId)

  const stats = preloadedStats || fetchedStats

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load usage data: {error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <BarChart3 className="mx-auto h-12 w-12 text-zinc-400" />
        <h4 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">No Usage Data</h4>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          This API key has not been used yet.
        </p>
      </div>
    )
  }

  // Transform hourly data for chart
  const hourlyData = stats.requestsByHour.map((item) => ({
    name: item.hour,
    requests: item.count,
  }))

  // Transform endpoint data for chart
  const endpointData = stats.topEndpoints.slice(0, 5).map((item) => ({
    name: item.endpoint.length > 30 ? `${item.endpoint.slice(0, 30)}...` : item.endpoint,
    requests: item.count,
    avgTime: item.avgTime,
  }))

  // Transform status code data for pie chart
  const statusData = Object.entries(stats.requestsByStatus).map(([status, count]) => ({
    name: `${status}`,
    value: count,
  }))

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard icon={Activity} label="Total Requests" value={stats.totalRequests} />
          <StatCard
            icon={Clock}
            label="Avg Response Time"
            value={`${Math.round(stats.averageResponseTime)}ms`}
          />
        </div>
        {hourlyData.length > 0 && (
          <Chart
            type="area"
            data={hourlyData}
            dataKey="requests"
            xAxisKey="name"
            height={150}
            showLegend={false}
            color="#3b82f6"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Activity} label="Total Requests" value={stats.totalRequests} />
        <StatCard
          icon={CheckCircle2}
          label="Successful"
          value={stats.successfulRequests}
          subValue={`${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}% success rate`}
        />
        <StatCard
          icon={XCircle}
          label="Failed"
          value={stats.failedRequests}
          subValue={`${stats.errorRate.toFixed(2)}% error rate`}
        />
        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value={`${Math.round(stats.averageResponseTime)}ms`}
        />
      </div>

      {/* Requests Over Time */}
      {hourlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="area"
              data={hourlyData}
              dataKey="requests"
              xAxisKey="name"
              height={250}
              showLegend={false}
              color="#3b82f6"
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Endpoints */}
        {endpointData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <Chart
                type="bar"
                data={endpointData}
                dataKey="requests"
                xAxisKey="name"
                height={200}
                showLegend={false}
                color="#10b981"
              />
              <div className="mt-4 space-y-2">
                {stats.topEndpoints.slice(0, 5).map((endpoint, i) => (
                  <div
                    key={endpoint.endpoint}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">{i + 1}.</span>
                      <code className="max-w-[200px] truncate text-xs">{endpoint.endpoint}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {endpoint.count.toLocaleString()}
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        {Math.round(endpoint.avgTime)}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Codes */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Status Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <Chart
                type="donut"
                data={statusData}
                dataKey="value"
                nameKey="name"
                height={200}
                showLegend={true}
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(stats.requestsByStatus).map(([status, count]) => {
                  const statusNum = parseInt(status)
                  const variant =
                    statusNum < 300
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : statusNum < 400
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : statusNum < 500
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'

                  return (
                    <div
                      key={status}
                      className={`flex items-center justify-between rounded-md px-3 py-2 ${variant}`}
                    >
                      <span className="font-mono text-sm font-medium">{status}</span>
                      <span className="text-sm">{count.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
