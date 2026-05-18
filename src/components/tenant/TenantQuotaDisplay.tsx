'use client'

import type { TenantQuota } from '@/types/tenant'
import { Database, HardDrive, Users, Zap } from 'lucide-react'

interface TenantQuotaDisplayProps {
  quota: TenantQuota
}

export function TenantQuotaDisplay({ quota }: TenantQuotaDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <QuotaCard
        icon={Users}
        label="Members"
        used={quota.members.used}
        limit={quota.members.limit}
      />
      <QuotaCard
        icon={HardDrive}
        label="Storage"
        used={quota.storage.used}
        limit={quota.storage.limit}
        format="bytes"
      />
      <QuotaCard
        icon={Zap}
        label="API Calls"
        used={quota.apiCalls.used}
        limit={quota.apiCalls.limit}
        format="number"
      />
      <QuotaCard
        icon={Database}
        label="Databases"
        used={quota.databases.used}
        limit={quota.databases.limit}
      />
    </div>
  )
}

function QuotaCard({
  icon: Icon,
  label,
  used,
  limit,
  format = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  used: number
  limit: number
  format?: 'default' | 'bytes' | 'number'
}) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0
  const isWarning = percentage >= 80
  const isCritical = percentage >= 95

  const formatValue = (value: number) => {
    if (format === 'bytes') return formatBytes(value)
    if (format === 'number') return value.toLocaleString()
    return value.toString()
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mb-2">
        <span className="text-2xl font-bold text-white">{formatValue(used)}</span>
        <span className="text-sm text-zinc-500"> / {formatValue(limit)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
        <div
          className={`h-full transition-all ${isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
