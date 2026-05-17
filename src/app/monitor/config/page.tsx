'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Database,
  RefreshCw,
  Save,
  Server,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface MonitoringConfig {
  prometheus: {
    enabled: boolean
    retentionDays: number
    scrapeInterval: string
  }
  loki: {
    enabled: boolean
    retentionDays: number
  }
  grafana: {
    enabled: boolean
    adminPassword: string
    anonymousAccess: boolean
  }
  alerting: {
    enabled: boolean
    emailEnabled: boolean
    slackEnabled: boolean
    slackWebhook: string
  }
}

function MonitorConfigContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [config, setConfig] = useState<MonitoringConfig | null>(null)

  const fetchConfig = useCallback(async () => {
    // No API route available — monitoring configuration is not exposed via the admin API.
    // Use `nself monitor config` to view or update configuration directly from the CLI.
    setConfig(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const saveConfig = async () => {
    setSaving(true)
    try {
      await fetch('/api/monitor/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (
    section: keyof MonitoringConfig,
    key: string,
    value: unknown,
  ) => {
    if (!config) return
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [key]: value,
      },
    })
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  if (!config) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <Link
              href="/monitor"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Monitor
            </Link>
            <h1 className="bg-gradient-to-r from-cyan-600 to-teal-400 bg-clip-text text-4xl font-bold text-transparent dark:from-cyan-400 dark:to-teal-300">
              Monitoring Configuration
            </h1>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <Settings className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Configuration not available
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Monitoring configuration is not exposed via the Admin API. Use the CLI
              to view or update configuration directly.
            </p>
            <p className="mt-4 font-mono text-sm text-cyan-500">
              nself monitor config
            </p>
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
            href="/monitor"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Monitor
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-cyan-600 to-teal-400 bg-clip-text text-4xl font-bold text-transparent dark:from-cyan-400 dark:to-teal-300">
                Monitoring Configuration
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Configure monitoring, logging, and alerting settings
              </p>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Prometheus */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Prometheus
              </h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.prometheus.enabled}
                  onChange={(e) =>
                    updateConfig('prometheus', 'enabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Enable Prometheus
                </span>
              </label>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Retention (days)
                </label>
                <input
                  type="number"
                  value={config.prometheus.retentionDays}
                  onChange={(e) =>
                    updateConfig(
                      'prometheus',
                      'retentionDays',
                      parseInt(e.target.value) || 15,
                    )
                  }
                  min={1}
                  max={365}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Scrape Interval
                </label>
                <select
                  value={config.prometheus.scrapeInterval}
                  onChange={(e) =>
                    updateConfig('prometheus', 'scrapeInterval', e.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="5s">5 seconds</option>
                  <option value="10s">10 seconds</option>
                  <option value="15s">15 seconds</option>
                  <option value="30s">30 seconds</option>
                  <option value="1m">1 minute</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loki */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Server className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Loki (Logs)
              </h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.loki.enabled}
                  onChange={(e) =>
                    updateConfig('loki', 'enabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Enable Loki
                </span>
              </label>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Log Retention (days)
                </label>
                <input
                  type="number"
                  value={config.loki.retentionDays}
                  onChange={(e) =>
                    updateConfig(
                      'loki',
                      'retentionDays',
                      parseInt(e.target.value) || 7,
                    )
                  }
                  min={1}
                  max={90}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Grafana */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Grafana
              </h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.grafana.enabled}
                  onChange={(e) =>
                    updateConfig('grafana', 'enabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Enable Grafana
                </span>
              </label>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={config.grafana.adminPassword}
                  onChange={(e) =>
                    updateConfig('grafana', 'adminPassword', e.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.grafana.anonymousAccess}
                  onChange={(e) =>
                    updateConfig('grafana', 'anonymousAccess', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Allow Anonymous Access
                </span>
              </label>
            </div>
          </div>

          {/* Alerting */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Alerting
              </h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.alerting.enabled}
                  onChange={(e) =>
                    updateConfig('alerting', 'enabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Enable Alerting
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.alerting.emailEnabled}
                  onChange={(e) =>
                    updateConfig('alerting', 'emailEnabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Email Notifications
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.alerting.slackEnabled}
                  onChange={(e) =>
                    updateConfig('alerting', 'slackEnabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Slack Notifications
                </span>
              </label>
              {config.alerting.slackEnabled && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Slack Webhook URL
                  </label>
                  <input
                    type="text"
                    value={config.alerting.slackWebhook}
                    onChange={(e) =>
                      updateConfig('alerting', 'slackWebhook', e.target.value)
                    }
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">nself monitor config</span> - Show
              current config
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself monitor config --set prometheus.retention=30
              </span>{' '}
              - Update config
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">nself monitor restart</span> -
              Restart monitoring services
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function MonitorConfigPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <MonitorConfigContent />
    </Suspense>
  )
}
