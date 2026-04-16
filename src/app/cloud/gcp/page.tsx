'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  CheckCircle,
  Cloud,
  Database,
  DollarSign,
  HardDrive,
  Rocket,
  Server,
  XCircle,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface GCEInstance {
  id: string
  name: string
  machineType: string
  status: 'RUNNING' | 'STOPPED' | 'TERMINATED'
  zone: string
  externalIP: string
  internalIP: string
  cost: number
}

interface CloudSQLInstance {
  id: string
  name: string
  databaseVersion: string
  tier: string
  status: 'RUNNABLE' | 'SUSPENDED'
  region: string
  ipAddress: string
  cost: number
}

interface GCSBucket {
  name: string
  location: string
  storageClass: string
  size: string
  cost: number
}

function GCPContent() {
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [serviceAccountKey, setServiceAccountKey] = useState('')
  const [gceInstances] = useState<GCEInstance[]>([])
  const [cloudSQLInstances] = useState<CloudSQLInstance[]>([])
  const [gcsBuckets] = useState<GCSBucket[]>([])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cloud/gcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, serviceAccountKey }),
      })

      if (response.ok) {
        setConnected(true)
      }
    } catch (_error) {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    // Deploy to GCP logic
  }

  const gceColumns: ColumnDef<GCEInstance>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'machineType',
      header: 'Machine Type',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'RUNNING'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {status === 'RUNNING' && <CheckCircle className="h-3 w-3" />}
            {status}
          </span>
        )
      },
    },
    {
      accessorKey: 'zone',
      header: 'Zone',
    },
    {
      accessorKey: 'externalIP',
      header: 'External IP',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.getValue('externalIP') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'cost',
      header: 'Monthly Cost',
      cell: ({ row }) => {
        const cost = row.getValue('cost') as number
        return <span className="font-mono">${cost.toFixed(2)}</span>
      },
    },
  ]

  const cloudSQLColumns: ColumnDef<CloudSQLInstance>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'databaseVersion',
      header: 'Database Version',
    },
    {
      accessorKey: 'tier',
      header: 'Tier',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'RUNNABLE'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}
          >
            {status}
          </span>
        )
      },
    },
    {
      accessorKey: 'cost',
      header: 'Monthly Cost',
      cell: ({ row }) => {
        const cost = row.getValue('cost') as number
        return <span className="font-mono">${cost.toFixed(2)}</span>
      },
    },
  ]

  const gcsColumns: ColumnDef<GCSBucket>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Bucket Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'storageClass',
      header: 'Storage Class',
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      accessorKey: 'cost',
      header: 'Monthly Cost',
      cell: ({ row }) => {
        const cost = row.getValue('cost') as number
        return <span className="font-mono">${cost.toFixed(2)}</span>
      },
    },
  ]

  const totalCost =
    gceInstances.reduce((sum, i) => sum + i.cost, 0) +
    cloudSQLInstances.reduce((sum, i) => sum + i.cost, 0) +
    gcsBuckets.reduce((sum, i) => sum + i.cost, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Google Cloud Platform (GCP)
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage GCP resources and deploy to Compute Engine, Cloud SQL, and
          Cloud Storage
        </p>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            GCP Connection
          </h2>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              connected
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {connected ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Not Connected
              </>
            )}
          </div>
        </div>

        {!connected ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectId">GCP Project ID</Label>
              <Input
                id="projectId"
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-project-12345"
              />
            </div>

            <div>
              <Label htmlFor="serviceAccount">Service Account Key (JSON)</Label>
              <Textarea
                id="serviceAccount"
                value={serviceAccountKey}
                onChange={(e) => setServiceAccountKey(e.target.value)}
                placeholder='{"type": "service_account", "project_id": "...", ...}'
                rows={6}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={!projectId || !serviceAccountKey || loading}
              >
                {loading ? 'Connecting...' : 'Connect to GCP'}
              </Button>
              <Button variant="outline">Test Connection</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Project ID
              </span>
              <span className="font-mono text-sm text-zinc-900 dark:text-white">
                {projectId}
              </span>
            </div>
            <Button variant="outline" onClick={() => setConnected(false)}>
              Disconnect
            </Button>
          </div>
        )}
      </Card>

      {connected && (
        <>
          {/* Cost Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Compute Instances
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {gceInstances.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <Database className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Cloud SQL
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {cloudSQLInstances.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <HardDrive className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Cloud Storage
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {gcsBuckets.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Monthly Cost
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    ${totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Deploy Button */}
          <Card className="border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cloud className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Deploy to GCP
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Deploy your nself project to Google Cloud Platform
                  </p>
                </div>
              </div>
              <Button onClick={handleDeploy}>
                <Rocket className="mr-2 h-4 w-4" />
                Deploy Now
              </Button>
            </div>
          </Card>

          {/* Resources */}
          {loading ? (
            <Card className="p-6">
              <Skeleton className="mb-4 h-6 w-48" />
              <Skeleton className="h-64 w-full" />
            </Card>
          ) : gceInstances.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Compute Engine Instances
              </h2>
              <DataTable
                columns={gceColumns}
                data={gceInstances}
                searchKey="name"
                searchPlaceholder="Search instances..."
                enableExport
              />
            </Card>
          ) : (
            <EmptyState
              icon={Server}
              title="No Compute Engine Instances"
              description="You don't have any GCE instances in this project"
            />
          )}

          {cloudSQLInstances.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Cloud SQL Instances
              </h2>
              <DataTable
                columns={cloudSQLColumns}
                data={cloudSQLInstances}
                searchKey="name"
                searchPlaceholder="Search databases..."
                enableExport
              />
            </Card>
          )}

          {gcsBuckets.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Cloud Storage Buckets
              </h2>
              <DataTable
                columns={gcsColumns}
                data={gcsBuckets}
                searchKey="name"
                searchPlaceholder="Search buckets..."
                enableExport
              />
            </Card>
          )}
        </>
      )}

      {!connected && (
        <Card className="border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                GCP Not Connected
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                Connect your GCP project to manage Compute Engine, Cloud SQL,
                and Cloud Storage resources
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function GCPPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <GCPContent />
    </Suspense>
  )
}
