'use client'

import { TenantCreateWizard } from '@/components/tenant'
import { useTenant } from '@/hooks/useTenant'
import type { CreateTenantInput } from '@/types/tenant'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreateTenantPage() {
  const router = useRouter()
  const { create, isLoading } = useTenant()
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (input: CreateTenantInput) => {
    setError(null)
    try {
      const tenant = await create(input)
      router.push(`/tenant/${tenant.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/tenant"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenants
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Create Tenant</h1>
        <p className="text-sm text-zinc-400">
          Set up a new tenant with custom branding and settings
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <TenantCreateWizard onCreate={handleCreate} isLoading={isLoading} />
    </div>
  )
}
