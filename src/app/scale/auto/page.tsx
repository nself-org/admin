'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Cpu,
  MemoryStick,
  RefreshCw,
  Save,
  Server,
  Settings,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface AutoScalingSettings {
  service: string
  enabled: boolean
  minReplicas: number
  maxReplicas: number
  targetCPU: number
  targetMemory: number
  scaleUpCooldown: number
  scaleDownCooldown: number
}

function AutoScalingContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [settings, setSettings] = useState<AutoScalingSettings[]>([])
  const [editingService, setEditingService] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockSettings: AutoScalingSettings[] = [
        {
          service: 'Hasura',
          enabled: true,
          minReplicas: 2,
          maxReplicas: 5,
          targetCPU: 70,
          targetMemory: 80,
          scaleUpCooldown: 60,
          scaleDownCooldown: 300,
        },
        {
          service: 'Auth Service',
          enabled: false,
          minReplicas: 1,
          maxReplicas: 3,
          targetCPU: 70,
          targetMemory: 80,
          scaleUpCooldown: 60,
          scaleDownCooldown: 300,
        },
        {
          service: 'Functions',
          enabled: true,
          minReplicas: 1,
          maxReplicas: 10,
          targetCPU: 60,
          targetMemory: 70,
          scaleUpCooldown: 30,
          scaleDownCooldown: 180,
        },
        {
          service: 'API Gateway',
          enabled: false,
          minReplicas: 1,
          maxReplicas: 5,
          targetCPU: 75,
          targetMemory: 80,
          scaleUpCooldown: 60,
          scaleDownCooldown: 300,
        },
      ]
      setSettings(mockSettings)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = (
    service: string,
    key: string,
    value: number | boolean,
  ) => {
    setSettings(
      settings.map((s) => (s.service === service ? { ...s, [key]: value } : s)),
    )
  }

  const saveSetting = async (service: string) => {
    setSaving(service)
    try {
      const setting = settings.find((s) => s.service === service)
      if (!setting) return

      await fetch('/api/scale/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setting),
      })

      setSaveSuccess(service)
      setEditingService(null)
      setTimeout(() => setSaveSuccess(null), 3000)
    } finally {
      setSaving(null)
    }
  }

  const enabledCount = settings.filter((s) => s.enabled).length

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <Link
            href="/scale"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scaling
          </Link>
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-indigo-400 dark:to-violet-300">
            Autoscaling Configuration
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Configure automatic scaling policies for your services
          </p>
        </div>

        {/* Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Server className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Services
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {settings.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Autoscaling Enabled
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {enabledCount}/{settings.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Max Total Replicas
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {settings.reduce((acc, s) => acc + s.maxReplicas, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Configurations */}
        <div className="space-y-6">
          {settings.map((setting) => (
            <div
              key={setting.service}
              className={`rounded-xl border bg-white p-6 shadow-sm transition-all dark:bg-zinc-800 ${
                setting.enabled
                  ? 'border-green-200 dark:border-green-800'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {setting.service}
                  </h3>
                  {saveSuccess === setting.service && (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={setting.enabled}
                      onChange={(e) =>
                        updateSetting(
                          setting.service,
                          'enabled',
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Enabled
                    </span>
                  </label>
                  {editingService === setting.service ? (
                    <button
                      onClick={() => saveSetting(setting.service)}
                      disabled={saving === setting.service}
                      className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
                    >
                      {saving === setting.service ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingService(setting.service)}
                      className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Settings className="h-4 w-4" />
                      Configure
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`grid gap-6 md:grid-cols-2 lg:grid-cols-4 ${
                  editingService !== setting.service ? 'opacity-75' : ''
                }`}
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Min Replicas
                  </label>
                  <input
                    type="number"
                    value={setting.minReplicas}
                    onChange={(e) =>
                      updateSetting(
                        setting.service,
                        'minReplicas',
                        parseInt(e.target.value) || 1,
                      )
                    }
                    disabled={editingService !== setting.service}
                    min={1}
                    max={setting.maxReplicas}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Max Replicas
                  </label>
                  <input
                    type="number"
                    value={setting.maxReplicas}
                    onChange={(e) =>
                      updateSetting(
                        setting.service,
                        'maxReplicas',
                        parseInt(e.target.value) || 1,
                      )
                    }
                    disabled={editingService !== setting.service}
                    min={setting.minReplicas}
                    max={100}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <Cpu className="h-4 w-4" />
                    Target CPU %
                  </label>
                  <input
                    type="number"
                    value={setting.targetCPU}
                    onChange={(e) =>
                      updateSetting(
                        setting.service,
                        'targetCPU',
                        parseInt(e.target.value) || 70,
                      )
                    }
                    disabled={editingService !== setting.service}
                    min={10}
                    max={100}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <MemoryStick className="h-4 w-4" />
                    Target Memory %
                  </label>
                  <input
                    type="number"
                    value={setting.targetMemory}
                    onChange={(e) =>
                      updateSetting(
                        setting.service,
                        'targetMemory',
                        parseInt(e.target.value) || 80,
                      )
                    }
                    disabled={editingService !== setting.service}
                    min={10}
                    max={100}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {editingService === setting.service && (
                <div className="mt-6 grid gap-6 border-t border-zinc-200 pt-6 md:grid-cols-2 dark:border-zinc-700">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Scale Up Cooldown (seconds)
                    </label>
                    <input
                      type="number"
                      value={setting.scaleUpCooldown}
                      onChange={(e) =>
                        updateSetting(
                          setting.service,
                          'scaleUpCooldown',
                          parseInt(e.target.value) || 60,
                        )
                      }
                      min={0}
                      max={3600}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Wait time before scaling up again
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Scale Down Cooldown (seconds)
                    </label>
                    <input
                      type="number"
                      value={setting.scaleDownCooldown}
                      onChange={(e) =>
                        updateSetting(
                          setting.service,
                          'scaleDownCooldown',
                          parseInt(e.target.value) || 300,
                        )
                      }
                      min={0}
                      max={3600}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Wait time before scaling down again
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself scale auto</span> - Show
              autoscaling status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself scale auto hasura --enable
              </span>{' '}
              - Enable autoscaling
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself scale auto hasura --min=2 --max=5
              </span>{' '}
              - Set replica limits
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself scale auto hasura --cpu=70 --memory=80
              </span>{' '}
              - Set targets
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function AutoScalingPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <AutoScalingContent />
    </Suspense>
  )
}
