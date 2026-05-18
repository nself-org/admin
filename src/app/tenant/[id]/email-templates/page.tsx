'use client'

import { FormSkeleton } from '@/components/skeletons'
import { ArrowLeft, Edit, Eye, Mail } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

export default function TenantEmailTemplatesPage() {
  const params = useParams()
  const tenantId = params.id as string

  const { data, error, isLoading } = useSWR(`/api/tenant/${tenantId}/email-templates`, fetcher)

  if (isLoading) return <FormSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/tenant/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenant
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Email Templates</h1>
        <p className="text-sm text-zinc-400">Customize automated email communications</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error.message}</p>
        </div>
      )}

      <div className="space-y-4">
        {(data?.templates || []).map((template: { id: string; name: string; subject: string }) => (
          <div
            key={template.id}
            className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
                <Mail className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">{template.name}</h3>
                <p className="text-sm text-zinc-500">{template.subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white">
                <Eye className="h-4 w-4" />
              </button>
              <Link
                href={`/tenant/${tenantId}/email-templates/${template.id}`}
                className="rounded p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                <Edit className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
