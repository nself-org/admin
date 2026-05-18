'use client'

import { TableSkeleton } from '@/components/skeletons'
import { Activity, ArrowLeft, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

export default function TenantAuditPage() {
  const params = useParams()
  const tenantId = params.id as string

  const { data, error, isLoading } = useSWR(`/api/audit?tenantId=${tenantId}`, fetcher)

  if (isLoading) return <TableSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/tenant/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenant
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm text-zinc-400">Track all tenant activity</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error.message}</p>
        </div>
      )}

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        {(data?.logs || []).length > 0 ? (
          <div className="divide-y divide-zinc-700">
            {data.logs.map(
              (log: { id: string; action: string; user: string; timestamp: string }) => (
                <div key={log.id} className="flex items-center gap-4 p-4">
                  <Activity className="h-5 w-5 text-zinc-500" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{log.action}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {log.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">No audit logs yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
