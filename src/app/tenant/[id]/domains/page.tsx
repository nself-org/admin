'use client'

import { FormSkeleton } from '@/components/skeletons'
import { TenantDomainManager } from '@/components/tenant'
import { api } from '@/lib/api-client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

export default function TenantDomainsPage() {
  const params = useParams()
  const tenantId = params.id as string
  const [isLoading, setIsLoading] = useState(false)

  const { data, error, mutate } = useSWR(`/api/tenant/${tenantId}/domains`, fetcher)

  const handleAdd = async (domain: string) => {
    setIsLoading(true)
    try {
      await api.post(`/api/tenant/${tenantId}/domains`, { domain })
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (domain: string) => {
    setIsLoading(true)
    try {
      await api.delete(`/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}`)
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (domain: string) => {
    setIsLoading(true)
    try {
      await api.post(`/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}/verify`)
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateSSL = async (domain: string) => {
    setIsLoading(true)
    try {
      await api.post(`/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}/ssl`)
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPrimary = async (domain: string) => {
    setIsLoading(true)
    try {
      await api.put(`/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}/primary`)
      mutate()
    } finally {
      setIsLoading(false)
    }
  }

  if (!data && !error) return <FormSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/tenant/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenant
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Custom Domains</h1>
        <p className="text-sm text-zinc-400">Configure custom domains for your tenant</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error.message}</p>
        </div>
      )}

      <TenantDomainManager
        domains={data?.domains || []}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onVerify={handleVerify}
        onGenerateSSL={handleGenerateSSL}
        onSetPrimary={handleSetPrimary}
        isLoading={isLoading}
      />
    </div>
  )
}
