'use client'

import { FormSkeleton } from '@/components/skeletons'
import { TenantBrandingEditor } from '@/components/tenant'
import { useTenantBranding } from '@/hooks/useTenantBranding'
import type { TenantBranding } from '@/types/tenant'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback } from 'react'

export default function TenantBrandingPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { branding, isLoading, error, updateLogo, updateColors, preview, reset } =
    useTenantBranding(tenantId)

  // Wrap functions to match expected interface (void return)
  const handleUpdateLogo = useCallback(
    async (file: File): Promise<void> => {
      await updateLogo(file)
    },
    [updateLogo]
  )

  const handleUpdateColors = useCallback(
    async (
      colors: Partial<Pick<TenantBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>>
    ): Promise<void> => {
      await updateColors(colors)
    },
    [updateColors]
  )

  const handleReset = useCallback(async (): Promise<void> => {
    await reset()
  }, [reset])

  if (isLoading) return <FormSkeleton />

  if (error || !branding) {
    return (
      <div className="space-y-8">
        <Link
          href={`/tenant/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenant
        </Link>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error || 'Failed to load branding'}</p>
        </div>
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
        <h1 className="mt-4 text-2xl font-semibold text-white">Branding</h1>
        <p className="text-sm text-zinc-400">Customize your tenant's look and feel</p>
      </div>

      <TenantBrandingEditor
        branding={branding}
        onUpdateLogo={handleUpdateLogo}
        onUpdateColors={handleUpdateColors}
        onPreview={preview}
        onReset={handleReset}
      />
    </div>
  )
}
