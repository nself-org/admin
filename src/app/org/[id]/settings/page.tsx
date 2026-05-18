'use client'

import { DashboardSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import type { OrgRole, OrgSettings } from '@/types/tenant'
import { AlertTriangle, ArrowLeft, Building, Save, Shield, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function OrgSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const { org, isLoading, error, update, remove } = useOrganization(orgId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState<OrgSettings>({
    allowTeamCreation: true,
    defaultRole: 'member',
    requireApproval: false,
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (org) {
      setName(org.name)
      setDescription(org.description || '')
      setSettings(org.settings)
    }
  }, [org])

  if (isLoading) return <DashboardSkeleton />

  if (error || !org) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{error || 'Organization not found'}</p>
      </div>
    )
  }

  const handleSettingChange = (key: keyof OrgSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      await update({ name, description, settings })
      setSaveSuccess(true)
      setHasChanges(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== org.name) return

    try {
      await remove()
      router.push('/org')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete organization')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/org/${orgId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {org.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-zinc-400">Manage organization settings and preferences</p>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{saveError}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-4">
          <p className="text-emerald-400">Settings saved successfully!</p>
        </div>
      )}

      {/* General Settings */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="border-b border-zinc-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-medium text-white">General</h2>
          </div>
        </div>
        <div className="space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setHasChanges(true)
              }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setHasChanges(true)
              }}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Describe your organization..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Slug</label>
            <input
              type="text"
              value={org.slug}
              disabled
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500">The slug cannot be changed after creation</p>
          </div>
        </div>
      </div>

      {/* Team Settings */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="border-b border-zinc-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-medium text-white">Team Settings</h2>
          </div>
        </div>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Allow Team Creation</p>
              <p className="text-xs text-zinc-500">
                Let members create new teams within this organization
              </p>
            </div>
            <button
              onClick={() => handleSettingChange('allowTeamCreation', !settings.allowTeamCreation)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.allowTeamCreation ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.allowTeamCreation ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Require Approval</p>
              <p className="text-xs text-zinc-500">
                New members must be approved by an admin before joining
              </p>
            </div>
            <button
              onClick={() => handleSettingChange('requireApproval', !settings.requireApproval)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.requireApproval ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.requireApproval ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Access Settings */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="border-b border-zinc-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-medium text-white">Access Settings</h2>
          </div>
        </div>
        <div className="space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Default Role for New Members</label>
            <select
              value={settings.defaultRole}
              onChange={(e) => handleSettingChange('defaultRole', e.target.value as OrgRole)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="viewer">Viewer - Read-only access</option>
              <option value="member">Member - Standard access</option>
              <option value="admin">Admin - Full access</option>
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              This role will be assigned to new members when they join
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-500/30 bg-red-900/10">
        <div className="border-b border-red-500/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-medium text-red-400">Danger Zone</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Delete Organization</p>
              <p className="text-xs text-zinc-400">
                Permanently delete this organization and all its data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <div className="border-b border-zinc-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Delete Organization</h2>
            </div>

            <div className="p-6">
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Warning</p>
                    <p className="mt-1 text-xs text-red-300">
                      This action is permanent and cannot be undone. All teams, members, and data
                      will be deleted.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-4 text-sm text-zinc-400">
                To confirm, type <strong className="text-white">{org.name}</strong> below:
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                placeholder="Type organization name..."
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== org.name}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
