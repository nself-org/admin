'use client'

import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  GitBranch,
  Globe,
  HardDrive,
  Mail,
  Network,
  RefreshCw,
  Server,
  Shield,
  XCircle,
  Zap,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

interface ServiceHealth {
  name: string
  displayName: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline'
  uptime: number
  responseTime: number
  errorRate: number
  cpu: number
  memory: number
  dependencies: string[]
  lastCheck: string
  metrics: {
    requests?: number
    errors?: number
    latency?: number
    throughput?: number
  }
}

interface HealthMatrix {
  services: ServiceHealth[]
  overall: 'healthy' | 'degraded' | 'critical'
  timestamp: string
}

function ServiceHealthContent() {
  const [healthMatrix, setHealthMatrix] = useState<HealthMatrix | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState<'matrix' | 'list' | 'dependencies'>('matrix')

  useEffect(() => {
    fetchHealthData()

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchHealthData = async () => {
    try {
      const res = await fetch('/api/services')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const services: ServiceHealth[] = data?.services ?? []
      const overallStatus = services.some((s) => s.status === 'unhealthy' || s.status === 'offline')
        ? 'critical'
        : services.some((s) => s.status === 'degraded')
          ? 'degraded'
          : 'healthy'
      setHealthMatrix({
        services,
        overall: overallStatus,
        timestamp: new Date().toISOString(),
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }

  const _getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'unhealthy':
        return 'bg-orange-500'
      case 'offline':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-orange-500" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getServiceIcon = (name: string) => {
    const icons: Record<string, any> = {
      postgres: Database,
      hasura: GitBranch,
      auth: Shield,
      minio: HardDrive,
      redis: Zap,
      nginx: Globe,
      mailpit: Mail,
      grafana: Activity,
      prometheus: Activity,
    }
    const Icon = icons[name] || Server
    return <Icon className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
        <button
          onClick={fetchHealthData}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  if (!healthMatrix) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Health Matrix</h1>
          <p className="text-muted-foreground mt-1">
            Real-time health monitoring and dependency tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" onClick={fetchHealthData}>
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card
        className={cn(
          'border-2',
          healthMatrix.overall === 'critical'
            ? 'border-red-500'
            : healthMatrix.overall === 'degraded'
              ? 'border-yellow-500'
              : 'border-green-500'
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Health Status</CardTitle>
            <Badge
              className={cn(
                healthMatrix.overall === 'critical'
                  ? 'bg-red-500'
                  : healthMatrix.overall === 'degraded'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              )}
            >
              {healthMatrix.overall.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">Total Services</p>
              <p className="text-2xl font-bold">{healthMatrix.services.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Healthy</p>
              <p className="text-2xl font-bold text-green-500">
                {healthMatrix.services.filter((s) => s.status === 'healthy').length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Degraded</p>
              <p className="text-2xl font-bold text-yellow-500">
                {healthMatrix.services.filter((s) => s.status === 'degraded').length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Unhealthy</p>
              <p className="text-2xl font-bold text-red-500">
                {
                  healthMatrix.services.filter(
                    (s) => s.status === 'unhealthy' || s.status === 'offline'
                  ).length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">Health Matrix</TabsTrigger>
          <TabsTrigger value="list">Service List</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        {/* Health Matrix View */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {healthMatrix.services.map((service) => (
              <Card
                key={service.name}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg',
                  selectedService === service.name && 'ring-primary ring-2'
                )}
                onClick={() => setSelectedService(service.name)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getServiceIcon(service.name)}
                      <CardTitle className="text-base">{service.displayName}</CardTitle>
                    </div>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Uptime</p>
                      <p className="font-medium">{service.uptime}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Response</p>
                      <p className="font-medium">{service.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CPU</p>
                      <Progress value={service.cpu} className="mt-1 h-1" />
                      <p className="text-xs">{service.cpu}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Memory</p>
                      <Progress value={service.memory} className="mt-1 h-1" />
                      <p className="text-xs">{service.memory}%</p>
                    </div>
                  </div>

                  {service.metrics && (
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-xs">
                        <span>Requests: {service.metrics.requests?.toLocaleString()}</span>
                        <span className="text-red-500">Errors: {service.metrics.errors}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Service Details */}
          {selectedService && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {healthMatrix.services.find((s) => s.name === selectedService)?.displayName}{' '}
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const service = healthMatrix.services.find((s) => s.name === selectedService)
                  if (!service) return null

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Status</p>
                          <div className="mt-1 flex items-center gap-2">
                            {getStatusIcon(service.status)}
                            <span className="font-medium capitalize">{service.status}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Error Rate</p>
                          <p className="font-medium">{service.errorRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Throughput</p>
                          <p className="font-medium">{service.metrics?.throughput} req/s</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Last Check</p>
                          <p className="text-xs font-medium">
                            {new Date(service.lastCheck).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {service.dependencies.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-2 text-sm">Dependencies</p>
                          <div className="flex gap-2">
                            {service.dependencies.map((dep) => (
                              <Badge key={dep} variant="outline">
                                {dep}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Service List View */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="p-4 text-left">Service</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Uptime</th>
                    <th className="p-4 text-left">Response Time</th>
                    <th className="p-4 text-left">CPU</th>
                    <th className="p-4 text-left">Memory</th>
                    <th className="p-4 text-left">Error Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {healthMatrix.services.map((service) => (
                    <tr key={service.name} className="hover:bg-accent border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getServiceIcon(service.name)}
                          <span className="font-medium">{service.displayName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(service.status)}
                          <span className="capitalize">{service.status}</span>
                        </div>
                      </td>
                      <td className="p-4">{service.uptime}%</td>
                      <td className="p-4">{service.responseTime}ms</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Progress value={service.cpu} className="h-2 w-16" />
                          <span className="text-sm">{service.cpu}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Progress value={service.memory} className="h-2 w-16" />
                          <span className="text-sm">{service.memory}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            service.errorRate > 1
                              ? 'text-red-500'
                              : service.errorRate > 0
                                ? 'text-yellow-500'
                                : 'text-green-500'
                          )}
                        >
                          {service.errorRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependencies View */}
        <TabsContent value="dependencies">
          <Card>
            <CardHeader>
              <CardTitle>Service Dependencies</CardTitle>
              <CardDescription>Dependency graph and impact analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthMatrix.services
                  .filter((s) => s.dependencies.length > 0)
                  .map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <div className="flex min-w-[150px] items-center gap-2">
                        {getServiceIcon(service.name)}
                        <span className="font-medium">{service.displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground text-sm">depends on</span>
                      </div>
                      <div className="flex gap-2">
                        {service.dependencies.map((dep) => {
                          const depService = healthMatrix.services.find((s) => s.name === dep)
                          return (
                            <Badge
                              key={dep}
                              className={cn(
                                depService?.status === 'healthy'
                                  ? 'bg-green-500'
                                  : depService?.status === 'degraded'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              )}
                            >
                              {dep}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ServiceHealthPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <ServiceHealthContent />
    </Suspense>
  )
}
