'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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

interface AzureVM {
  id: string
  name: string
  size: string
  status: 'running' | 'stopped' | 'deallocated'
  location: string
  publicIP: string
  privateIP: string
  cost: number
}

interface AzureSQL {
  id: string
  name: string
  sku: string
  status: 'Online' | 'Paused'
  location: string
  serverName: string
  cost: number
}

interface BlobStorage {
  name: string
  location: string
  replication: string
  size: string
  cost: number
}

function AzureContent() {
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [subscriptionId, setSubscriptionId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [vms] = useState<AzureVM[]>([])
  const [sqlDatabases] = useState<AzureSQL[]>([])
  const [blobStorage] = useState<BlobStorage[]>([])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cloud/azure/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          clientId,
          clientSecret,
          tenantId,
        }),
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
    // Deploy to Azure logic
  }

  const vmColumns: ColumnDef<AzureVM>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'size',
      header: 'VM Size',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'running'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {status === 'running' && <CheckCircle className="h-3 w-3" />}
            {status}
          </span>
        )
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'publicIP',
      header: 'Public IP',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.getValue('publicIP') || '-'}
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

  const sqlColumns: ColumnDef<AzureSQL>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Database Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'serverName',
      header: 'Server',
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'Online'
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

  const blobColumns: ColumnDef<BlobStorage>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Storage Account</SortableHeader>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'replication',
      header: 'Replication',
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
    vms.reduce((sum, i) => sum + i.cost, 0) +
    sqlDatabases.reduce((sum, i) => sum + i.cost, 0) +
    blobStorage.reduce((sum, i) => sum + i.cost, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Microsoft Azure
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage Azure resources and deploy to Virtual Machines, Azure SQL, and
          Blob Storage
        </p>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Azure Connection
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
              <Label htmlFor="subscriptionId">Subscription ID</Label>
              <Input
                id="subscriptionId"
                type="text"
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>

            <div>
              <Label htmlFor="clientId">Client ID (Application ID)</Label>
              <Input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>

            <div>
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={
                  !subscriptionId ||
                  !clientId ||
                  !clientSecret ||
                  !tenantId ||
                  loading
                }
              >
                {loading ? 'Connecting...' : 'Connect to Azure'}
              </Button>
              <Button variant="outline">Test Connection</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Subscription ID
              </span>
              <span className="font-mono text-sm text-zinc-900 dark:text-white">
                {subscriptionId.substring(0, 8)}...
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
                    Virtual Machines
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {vms.length}
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
                    SQL Databases
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {sqlDatabases.length}
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
                    Blob Storage
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {blobStorage.length}
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
                    Deploy to Azure
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Deploy your nself project to Microsoft Azure
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
          ) : vms.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Virtual Machines
              </h2>
              <DataTable
                columns={vmColumns}
                data={vms}
                searchKey="name"
                searchPlaceholder="Search VMs..."
                enableExport
              />
            </Card>
          ) : (
            <EmptyState
              icon={Server}
              title="No Virtual Machines"
              description="You don't have any Azure VMs in this subscription"
            />
          )}

          {sqlDatabases.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Azure SQL Databases
              </h2>
              <DataTable
                columns={sqlColumns}
                data={sqlDatabases}
                searchKey="name"
                searchPlaceholder="Search databases..."
                enableExport
              />
            </Card>
          )}

          {blobStorage.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Blob Storage Accounts
              </h2>
              <DataTable
                columns={blobColumns}
                data={blobStorage}
                searchKey="name"
                searchPlaceholder="Search storage..."
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
                Azure Not Connected
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                Connect your Azure subscription to manage VMs, SQL databases,
                and Blob Storage
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function AzurePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <AzureContent />
    </Suspense>
  )
}
