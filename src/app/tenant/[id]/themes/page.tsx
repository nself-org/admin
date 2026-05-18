'use client'

import { FormSkeleton } from '@/components/skeletons'
import { api } from '@/lib/api-client'
import { ArrowLeft, Check, Palette } from 'lucide-react'
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

export default function TenantThemesPage() {
  const params = useParams()
  const tenantId = params.id as string
  const [applying, setApplying] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR(`/api/tenant/${tenantId}/themes`, fetcher)

  const handleApply = async (themeId: string) => {
    setApplying(themeId)
    try {
      await api.put(`/api/tenant/${tenantId}/themes/apply`, { themeId })
      mutate()
    } finally {
      setApplying(null)
    }
  }

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
        <h1 className="mt-4 text-2xl font-semibold text-white">Themes</h1>
        <p className="text-sm text-zinc-400">Choose a theme for your tenant</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data?.themes || []).map(
          (theme: { id: string; name: string; description: string; isDefault: boolean }) => (
            <div
              key={theme.id}
              className={`relative rounded-lg border p-4 transition-colors ${
                theme.isDefault
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              {theme.isDefault && (
                <div className="absolute top-2 right-2">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
              )}
              <div className="mb-4 flex h-24 items-center justify-center rounded-lg bg-zinc-900">
                <Palette className="h-8 w-8 text-zinc-600" />
              </div>
              <h3 className="font-medium text-white">{theme.name}</h3>
              <p className="mb-4 text-sm text-zinc-500">{theme.description}</p>
              {!theme.isDefault && (
                <button
                  onClick={() => handleApply(theme.id)}
                  disabled={applying === theme.id}
                  className="w-full rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
                >
                  {applying === theme.id ? 'Applying...' : 'Apply Theme'}
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
