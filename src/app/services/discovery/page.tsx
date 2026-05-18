'use client'

import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Network, RefreshCw, Server, Shield } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceEndpoint {
  name: string
  url: string
  port: number
  protocol: string
  status: 'active' | 'inactive'
  healthCheck: string
  lastSeen: string
}

function DiscoveryContent() {
  const [loading, setLoading] = useState(true)
  const [endpoints, setEndpoints] = useState<ServiceEndpoint[]>([])

  const fetchEndpoints = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        const discovered: ServiceEndpoint[] = (data.services || []).map(
          (svc: { name: string; port?: number; status?: string }) => ({
            name: svc.name,
            url: `http://localhost:${svc.port || 80}`,
            port: svc.port || 80,
            protocol: 'HTTP',
            status: svc.status === 'running' ? 'active' : 'inactive',
            healthCheck: `/api/services/${svc.name}/health`,
            lastSeen: new Date().toISOString(),
          })
        )
        setEndpoints(discovered)
      }
    } catch (_error) {
      // Service discovery may not be available
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEndpoints()
  }, [fetchEndpoints])

  if (loading) {
    return <ServiceDetailSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Service Discovery</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Automatically discovered service endpoints and health status
          </p>
        </div>
        <button
          onClick={fetchEndpoints}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{endpoints.length}</p>
              <p className="text-sm text-zinc-500">Total Services</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20">
              <Network className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {endpoints.filter((e) => e.status === 'active').length}
              </p>
              <p className="text-sm text-zinc-500">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
              <Shield className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {endpoints.filter((e) => e.protocol === 'HTTPS').length}
              </p>
              <p className="text-sm text-zinc-500">HTTPS Secured</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discovered Endpoints</CardTitle>
          <CardDescription>Service endpoints found in the current Docker network</CardDescription>
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <div className="py-12 text-center">
              <Globe className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-4 text-sm text-zinc-500">
                No service endpoints discovered. Start your services to see them here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Service</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">URL</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Port</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Protocol</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint) => (
                    <tr
                      key={endpoint.name}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                        {endpoint.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {endpoint.url}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {endpoint.port}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {endpoint.protocol}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={endpoint.status === 'active' ? 'default' : 'secondary'}>
                          {endpoint.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ServiceDiscoveryPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <DiscoveryContent />
    </Suspense>
  )
}
