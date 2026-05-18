'use client'

import { Button } from '@/components/Button'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  RefreshCw,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ValidationCheck {
  name: string
  category: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  suggestion?: string
}

interface ValidationResult {
  checks: ValidationCheck[]
  categories: Record<string, { total: number; passed: number; failed: number; warnings: number }>
  summary: { total: number; passed: number; failed: number; warnings: number; score: string }
  rawOutput: string
  timestamp: string
}

interface ApiResponse {
  success: boolean
  data?: ValidationResult
  error?: string
  details?: string
}

function statusColor(status: ValidationCheck['status']) {
  switch (status) {
    case 'pass':
      return 'text-green-400'
    case 'fail':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
  }
}

function statusIcon(status: ValidationCheck['status']) {
  switch (status) {
    case 'pass':
      return <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
    case 'fail':
      return <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-400" />
  }
}

function ValidateContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const runValidation = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/config/validate')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${response.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      const json: ApiResponse = await response.json()
      if (!json.success || !json.data) {
        setError(json.error ?? 'Validation returned no data')
        return
      }
      setResult(json.data)
      setActiveCategory(null)
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    runValidation()
  }, [runValidation])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <FormSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Make sure the nself stack is running before validating configuration.
            </p>
          </div>
        </div>
        <Button onClick={runValidation} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !result) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Validation failed</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={runValidation} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!result) {
    return (
      <div className="p-6 text-center text-gray-400">
        <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No validation results available.</p>
        <Button
          onClick={runValidation}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Run Validation
        </Button>
      </div>
    )
  }

  const { summary, categories, checks } = result
  const categoryNames = Object.keys(categories)
  const filteredChecks = activeCategory
    ? checks.filter((c) => c.category === activeCategory)
    : checks

  const scoreOk = summary.failed === 0
  const scoreBanner =
    summary.failed > 0
      ? 'bg-red-500/10 border-red-500/30'
      : summary.warnings > 0
        ? 'bg-yellow-500/10 border-yellow-500/30'
        : 'bg-green-500/10 border-green-500/30'

  // States 6 + 7: Success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Configuration Validation</h2>
          <p className="mt-1 text-sm text-gray-400">
            Last run: {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
        <Button onClick={runValidation} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Validating…' : 'Re-validate'}
        </Button>
      </div>

      {/* Score banner */}
      <div className={`flex items-center gap-4 rounded-lg border p-4 ${scoreBanner}`}>
        {scoreOk ? (
          <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-400" />
        ) : (
          <XCircle className="h-6 w-6 flex-shrink-0 text-red-400" />
        )}
        <div className="flex-1">
          <p className="font-medium text-white">
            Score: <span className="font-mono">{summary.score}</span> checks passed
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            {summary.passed} passed · {summary.failed} failed · {summary.warnings} warnings
          </p>
        </div>
      </div>

      {/* Category filter pills */}
      {categoryNames.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === null
                ? 'border border-sky-500/30 bg-sky-500/20 text-sky-400'
                : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All ({summary.total})
          </button>
          {categoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                activeCategory === cat
                  ? 'border border-sky-500/30 bg-sky-500/20 text-sky-400'
                  : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {cat} ({categories[cat].total})
            </button>
          ))}
        </div>
      )}

      {/* Checks list — State 3 empty variant */}
      {filteredChecks.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">No validation checks found.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
          {filteredChecks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              {statusIcon(check.status)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{check.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">{check.message}</p>
                {check.suggestion && (
                  <p className="mt-1 font-mono text-xs text-sky-400">{check.suggestion}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className={`text-xs font-medium capitalize ${statusColor(check.status)}`}>
                  {check.status}
                </span>
                <span className="text-xs text-gray-600 capitalize">{check.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error overlay when result present but error also set */}
      {error && result && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

export default function ValidatePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ValidateContent />
    </Suspense>
  )
}
