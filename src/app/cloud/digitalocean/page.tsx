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

interface Droplet {
  id: string
  name: string
  size: string
  status: 'active' | 'off' | 'archive'
  region: string
  publicIP: string
  privateIP: string
  cost: number
}

interface DODatabase {
  id: string
  name: string
  engine: string
  engineVersion: string
  size: string
  status: 'online' | 'creating' | 'offline'
  region: string
  cost: number
}

interface Space {
  name: string
  region: string
  size: string
  cost: number
}

function DigitalOceanContent() {
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [droplets] = useState<Droplet[]>([])
  const [databases] = useState<DODatabase[]>([])
  const [spaces] = useState<Space[]>([])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cloud/digitalocean/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken }),
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
    // Deploy to DigitalOcean logic
  }

  const dropletColumns: ColumnDef<Droplet>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {status === 'active' && <CheckCircle className="h-3 w-3" />}
            {status}
          </span>
        )
      },
    },
    {
      accessorKey: 'region',
      header: 'Region',
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

  const databaseColumns: ColumnDef<DODatabase>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'engine',
      header: 'Engine',
      cell: ({ row }) => {
        const version = row.original.engineVersion
        return (
          <span>
            {row.getValue('engine')} {version}
          </span>
        )
      },
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'online'
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

  const spaceColumns: ColumnDef<Space>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Space Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'region',
      header: 'Region',
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
    droplets.reduce((sum, i) => sum + i.cost, 0) +
    databases.reduce((sum, i) => sum + i.cost, 0) +
    spaces.reduce((sum, i) => sum + i.cost, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          DigitalOcean
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage DigitalOcean resources and deploy to Droplets, Databases, and
          Spaces
        </p>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            DigitalOcean Connection
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
              <Label htmlFor="apiToken">API Token</Label>
              <Input
                id="apiToken"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="dop_v1_..."
              />
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Generate a token in your DigitalOcean account settings
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={!apiToken || loading}>
                {loading ? 'Connecting...' : 'Connect to DigitalOcean'}
              </Button>
              <Button variant="outline">Test Connection</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                API Token
              </span>
              <span className="font-mono text-sm text-zinc-900 dark:text-white">
                {apiToken.substring(0, 10)}...
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
                    Droplets
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {droplets.length}
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
                    Databases
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {databases.length}
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
                    Spaces
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {spaces.length}
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
                    Deploy to DigitalOcean
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Deploy your nself project to DigitalOcean infrastructure
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
          ) : droplets.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Droplets
              </h2>
              <DataTable
                columns={dropletColumns}
                data={droplets}
                searchKey="name"
                searchPlaceholder="Search droplets..."
                enableExport
              />
            </Card>
          ) : (
            <EmptyState
              icon={Server}
              title="No Droplets"
              description="You don't have any DigitalOcean Droplets"
            />
          )}

          {databases.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Managed Databases
              </h2>
              <DataTable
                columns={databaseColumns}
                data={databases}
                searchKey="name"
                searchPlaceholder="Search databases..."
                enableExport
              />
            </Card>
          )}

          {spaces.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Spaces (Object Storage)
              </h2>
              <DataTable
                columns={spaceColumns}
                data={spaces}
                searchKey="name"
                searchPlaceholder="Search spaces..."
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
                DigitalOcean Not Connected
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                Connect your DigitalOcean account to manage Droplets, Databases,
                and Spaces
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function DigitalOceanPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DigitalOceanContent />
    </Suspense>
  )
}
