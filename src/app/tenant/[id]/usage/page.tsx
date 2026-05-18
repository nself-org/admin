'use client'

import { ChartSkeleton } from '@/components/skeletons'
import { TenantQuotaDisplay } from '@/components/tenant'
import { useTenant } from '@/hooks/useTenant'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TenantUsagePage() {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant, isLoading, error } = useTenant(tenantId)

  if (isLoading) return <ChartSkeleton />

  if (error || !tenant) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{error || 'Failed to load usage data'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/tenant/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenant
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Usage</h1>
        <p className="text-sm text-zinc-400">Monitor resource usage and quotas</p>
      </div>

      <TenantQuotaDisplay quota={tenant.quota} />

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-medium text-white">Usage Trends</h2>
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-zinc-900">
          <p className="text-zinc-500">Usage chart coming soon</p>
        </div>
      </div>
    </div>
  )
}
