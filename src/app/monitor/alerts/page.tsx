'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import type { Alert, AlertRule } from '@/types/performance'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Settings,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function AlertsContent() {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'active')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    try {
      // Fetch alerts and rules from real API endpoints
      const [alertsRes, rulesRes] = await Promise.allSettled([
        fetch('/api/monitor/alerts'),
        fetch('/api/monitor/alerts/rules'),
      ])

      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const data = await alertsRes.value.json()
        if (data.success && data.data) {
          setAlerts(data.data)
        }
        // If no alerts endpoint or empty response, alerts stays []
      }

      if (rulesRes.status === 'fulfilled' && rulesRes.value.ok) {
        const data = await rulesRes.value.json()
        if (data.success && data.data) {
          setRules(data.data)
        }
        // If no rules endpoint or empty response, rules stays []
      }
    } catch (_error) {
      // Handle error silently - empty state is shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const acknowledgeAlert = async (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  const toggleRule = async (id: string) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    )
  }

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false
    if (
      searchQuery &&
      !a.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !a.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    return true
  })

  const activeAlerts = alerts.filter((a) => a.status === 'firing').length
  const criticalAlerts = alerts.filter(
    (a) => a.severity === 'critical' && a.status === 'firing',
  ).length

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return XCircle
      case 'warning':
        return AlertTriangle
      default:
        return AlertCircle
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30'
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30'
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
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
              <h1 className="bg-gradient-to-r from-red-600 to-orange-400 bg-clip-text text-4xl font-bold text-transparent dark:from-red-400 dark:to-orange-300">
                Alert Management
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Monitor and manage system alerts
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
              <Plus className="h-4 w-4" />
              Create Rule
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Active Alerts
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {activeAlerts}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Critical
                </p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {criticalAlerts}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Resolved Today
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {alerts.filter((a) => a.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Alert Rules
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {rules.filter((r) => r.enabled).length}/{rules.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-zinc-200 dark:border-zinc-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === 'active'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Active Alerts ({activeAlerts})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === 'rules'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Alert Rules ({rules.length})
            </button>
          </nav>
        </div>

        {activeTab === 'active' && (
          <>
            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {filteredAlerts.map((alert) => {
                const Icon = getSeverityIcon(alert.severity)
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 ${
                      alert.status === 'resolved'
                        ? 'border-zinc-200 opacity-60 dark:border-zinc-700'
                        : alert.severity === 'critical'
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                          : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${getSeverityBg(alert.severity)}`}
                        >
                          <Icon
                            className={`h-5 w-5 ${getSeverityColor(alert.severity)}`}
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="font-semibold text-zinc-900 dark:text-white">
                              {alert.name}
                            </h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getSeverityBg(alert.severity)} ${getSeverityColor(alert.severity)}`}
                            >
                              {alert.severity}
                            </span>
                            {alert.status === 'resolved' && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            {alert.message}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
                            <span>{alert.source}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(alert.startedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-800 ${
                  rule.enabled
                    ? 'border-zinc-200 dark:border-zinc-700'
                    : 'border-zinc-200 opacity-60 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-semibold text-zinc-900 dark:text-white">
                        {rule.name}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getSeverityBg(rule.severity)} ${getSeverityColor(rule.severity)}`}
                      >
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {rule.message}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                        {rule.condition}
                      </code>
                      <span className="text-zinc-500">
                        Duration: {rule.duration}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      rule.enabled
                        ? 'bg-green-600 text-white'
                        : 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {rule.enabled ? (
                      <>
                        <Bell className="h-4 w-4" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <BellOff className="h-4 w-4" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself alerts</span> - List active
              alerts
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself alerts --ack=id</span> -
              Acknowledge alert
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself alerts rules</span> - List
              alert rules
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">
                nself alerts rules --disable=name
              </span>{' '}
              - Disable rule
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <AlertsContent />
    </Suspense>
  )
}
