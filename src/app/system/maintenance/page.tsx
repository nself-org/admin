'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import { AlertTriangle, Loader2, Power, Save, Wrench } from 'lucide-react'
import { Suspense, useState } from 'react'

function SystemMaintenanceContent() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [message, setMessage] = useState(
    'System is currently under maintenance. We will be back soon.',
  )
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [_allowedIPs, _setAllowedIPs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleMaintenanceMode = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setMaintenanceMode(!maintenanceMode)
    setSaving(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <Wrench className="h-8 w-8 text-blue-500" />
                Maintenance Mode
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Enable maintenance mode to restrict access during updates
              </p>
            </div>
            <Button onClick={toggleMaintenanceMode} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {maintenanceMode ? 'Disabling...' : 'Enabling...'}
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  {maintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
                </>
              )}
            </Button>
          </div>

          {maintenanceMode && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <h3 className="mb-1 font-medium text-yellow-900 dark:text-yellow-100">
                    Maintenance Mode Active
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    The system is currently in maintenance mode. Only
                    whitelisted IP addresses can access the application.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">Maintenance Message</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Custom Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  This message will be shown to users during maintenance
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">
              Schedule Maintenance Window
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">Allowed IP Addresses</h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              These IP addresses will have access during maintenance mode
            </p>
            <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500">
                No IP addresses whitelisted yet
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SystemMaintenancePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SystemMaintenanceContent />
    </Suspense>
  )
}
