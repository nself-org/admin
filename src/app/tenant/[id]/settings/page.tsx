'use client'

import { FormSkeleton } from '@/components/skeletons'
import { useTenant } from '@/hooks/useTenant'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TenantSettingsPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant, isLoading, error, update } = useTenant(tenantId)

  const [settings, setSettings] = useState({
    allowPublicSignup: false,
    requireEmailVerification: true,
    maxMembers: 10,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (tenant?.settings) {
      setSettings({
        allowPublicSignup: tenant.settings.allowPublicSignup,
        requireEmailVerification: tenant.settings.requireEmailVerification,
        maxMembers: tenant.settings.maxMembers,
      })
    }
  }, [tenant])

  if (isLoading) return <FormSkeleton />

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await update({ settings })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
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
        <h1 className="mt-4 text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-zinc-400">Configure tenant behavior and limits</p>
      </div>

      {(error || saveError) && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error || saveError}</p>
        </div>
      )}

      <div className="space-y-6 rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Authentication</h2>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm text-white">Allow Public Signup</span>
              <p className="text-xs text-zinc-500">Allow users to self-register</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowPublicSignup}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowPublicSignup: e.target.checked,
                })
              }
              className="h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm text-white">Require Email Verification</span>
              <p className="text-xs text-zinc-500">Users must verify email before access</p>
            </div>
            <input
              type="checkbox"
              checked={settings.requireEmailVerification}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  requireEmailVerification: e.target.checked,
                })
              }
              className="h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
            />
          </label>
        </div>

        <div className="border-t border-zinc-700 pt-4">
          <h2 className="mb-4 text-lg font-medium text-white">Limits</h2>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Maximum Members</label>
            <input
              type="number"
              value={settings.maxMembers}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxMembers: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              min={1}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
