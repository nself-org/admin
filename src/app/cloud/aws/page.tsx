'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface EC2Instance {
  id: string
  name: string
  type: string
  state: 'running' | 'stopped' | 'terminated'
  region: string
  publicIP: string
  privateIP: string
  cost: number
}

interface RDSDatabase {
  id: string
  name: string
  engine: string
  engineVersion: string
  instanceClass: string
  status: 'available' | 'stopped' | 'creating'
  region: string
  endpoint: string
  cost: number
}

interface S3Bucket {
  name: string
  region: string
  size: string
  objects: number
  cost: number
}

function AWSContent() {
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [region, setRegion] = useState('us-east-1')
  const [ec2Instances] = useState<EC2Instance[]>([])
  const [rdsInstances] = useState<RDSDatabase[]>([])
  const [s3Buckets] = useState<S3Bucket[]>([])

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  ]

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cloud/aws/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, secretKey, region }),
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
    // Deploy to AWS logic
  }

  const ec2Columns: ColumnDef<EC2Instance>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Instance Type',
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => {
        const state = row.getValue('state') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              state === 'running'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : state === 'stopped'
                  ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {state === 'running' && <CheckCircle className="h-3 w-3" />}
            {state === 'stopped' && <XCircle className="h-3 w-3" />}
            {state}
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

  const rdsColumns: ColumnDef<RDSDatabase>[] = [
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
      accessorKey: 'instanceClass',
      header: 'Instance Class',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'available'
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

  const s3Columns: ColumnDef<S3Bucket>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column}>Bucket Name</SortableHeader>
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
      accessorKey: 'objects',
      header: 'Objects',
      cell: ({ row }) => {
        const count = row.getValue('objects') as number
        return count.toLocaleString()
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

  const totalCost =
    ec2Instances.reduce((sum, i) => sum + i.cost, 0) +
    rdsInstances.reduce((sum, i) => sum + i.cost, 0) +
    s3Buckets.reduce((sum, i) => sum + i.cost, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Amazon Web Services (AWS)
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage AWS resources and deploy to EC2, RDS, and S3
        </p>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            AWS Connection
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
              <Label htmlFor="accessKey">AWS Access Key ID</Label>
              <Input
                id="accessKey"
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="AKIA..."
              />
            </div>

            <div>
              <Label htmlFor="secretKey">AWS Secret Access Key</Label>
              <Input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="region">Default Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={!accessKey || !secretKey || loading}
              >
                {loading ? 'Connecting...' : 'Connect to AWS'}
              </Button>
              <Button variant="outline">Test Connection</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Region
              </span>
              <span className="font-mono text-sm text-zinc-900 dark:text-white">
                {region}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Access Key
              </span>
              <span className="font-mono text-sm text-zinc-900 dark:text-white">
                {accessKey.substring(0, 8)}...
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
                    EC2 Instances
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {ec2Instances.length}
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
                    RDS Databases
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {rdsInstances.length}
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
                    S3 Buckets
                  </p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {s3Buckets.length}
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
                    Deploy to AWS
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Deploy your nself project to AWS EC2 and RDS
                  </p>
                </div>
              </div>
              <Button onClick={handleDeploy}>
                <Rocket className="mr-2 h-4 w-4" />
                Deploy Now
              </Button>
            </div>
          </Card>

          {/* EC2 Instances */}
          {loading ? (
            <Card className="p-6">
              <Skeleton className="mb-4 h-6 w-48" />
              <Skeleton className="h-64 w-full" />
            </Card>
          ) : ec2Instances.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                EC2 Instances
              </h2>
              <DataTable
                columns={ec2Columns}
                data={ec2Instances}
                searchKey="name"
                searchPlaceholder="Search instances..."
                enableExport
              />
            </Card>
          ) : (
            <EmptyState
              icon={Server}
              title="No EC2 Instances"
              description="You don't have any EC2 instances in this region"
            />
          )}

          {/* RDS Databases */}
          {rdsInstances.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                RDS Databases
              </h2>
              <DataTable
                columns={rdsColumns}
                data={rdsInstances}
                searchKey="name"
                searchPlaceholder="Search databases..."
                enableExport
              />
            </Card>
          )}

          {/* S3 Buckets */}
          {s3Buckets.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                S3 Buckets
              </h2>
              <DataTable
                columns={s3Columns}
                data={s3Buckets}
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
                AWS Not Connected
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                Connect your AWS account to manage EC2, RDS, and S3 resources
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function AWSPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <AWSContent />
    </Suspense>
  )
}
