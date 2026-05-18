'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Lightbulb,
  RefreshCw,
  Shield,
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

interface CategorySummary {
  total: number
  passed: number
  failed: number
  warnings: number
}

interface ValidationData {
  checks: ValidationCheck[]
  categories: Record<string, CategorySummary>
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
    score: string
  }
  rawOutput: string
  timestamp: string
}

const CATEGORY_LABELS: Record<string, string> = {
  database: 'Database',
  auth: 'Authentication',
  ssl: 'SSL / TLS',
  services: 'Services',
  network: 'Network',
  storage: 'Storage',
  email: 'Email',
  config: 'Configuration',
  general: 'General',
}

const CATEGORY_ORDER = [
  'services',
  'database',
  'auth',
  'ssl',
  'network',
  'storage',
  'config',
  'email',
  'general',
]

function getCategoryLabel(key: string): string {
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

function StatusIcon({ status }: { status: 'pass' | 'fail' | 'warning' }) {
  switch (status) {
    case 'pass':
      return <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
    case 'fail':
      return <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
  }
}

function HealthBadge({ summary }: { summary: ValidationData['summary'] | null }) {
  if (!summary) return null

  const { total, passed, failed } = summary
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0

  let colorClasses: string
  let label: string
  if (failed === 0 && total > 0) {
    colorClasses =
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    label = 'All Passing'
  } else if (percentage >= 70) {
    colorClasses =
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
    label = 'Needs Attention'
  } else {
    colorClasses =
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    label = 'Critical Issues'
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${colorClasses}`}
    >
      <Shield className="h-4 w-4" />
      <span>{summary.score} checks passing</span>
      <span className="text-xs font-normal opacity-75">({label})</span>
    </div>
  )
}

function CategoryGroup({
  category,
  checks,
  categorySummary,
  defaultOpen,
}: {
  category: string
  checks: ValidationCheck[]
  categorySummary: CategorySummary
  defaultOpen: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const hasFailures = categorySummary.failed > 0
  const hasWarnings = categorySummary.warnings > 0

  let borderColor = 'border-zinc-200 dark:border-zinc-700'
  if (hasFailures) borderColor = 'border-red-200 dark:border-red-800/50'
  else if (hasWarnings) borderColor = 'border-yellow-200 dark:border-yellow-800/50'

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-zinc-800 ${borderColor}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            {getCategoryLabel(category)}
          </h3>
          <div className="flex items-center gap-2">
            {categorySummary.passed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {categorySummary.passed} passed
              </span>
            )}
            {categorySummary.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {categorySummary.failed} failed
              </span>
            )}
            {categorySummary.warnings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                {categorySummary.warnings} warnings
              </span>
            )}
          </div>
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {categorySummary.passed}/{categorySummary.total}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-100 dark:border-zinc-700">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {checks.map((check, index) => (
              <div key={index} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <StatusIcon status={check.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {check.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {check.message}
                    </p>
                    {check.suggestion && check.status === 'fail' && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {check.suggestion}
                        </p>
                      </div>
                    )}
                    {check.suggestion && check.status === 'warning' && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-yellow-50 p-2 dark:bg-yellow-900/20">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          {check.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfigValidateContent() {
  const [loading, setLoading] = useState(false)
  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastValidated, setLastValidated] = useState<string | null>(null)

  const runValidation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/config/validate')
      const json = await response.json()

      if (json.success && json.data) {
        setValidationData(json.data)
        setLastValidated(json.data.timestamp)
      } else {
        setError(json.error || 'Validation failed')
      }
    } catch (_err) {
      setError('Failed to connect to validation API')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-run on page load
  useEffect(() => {
    runValidation()
  }, [runValidation])

  // Sort categories by defined order, then alphabetically for unknowns
  const sortedCategories = validationData
    ? Object.keys(validationData.categories).sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a)
        const indexB = CATEGORY_ORDER.indexOf(b)
        if (indexA === -1 && indexB === -1) return a.localeCompare(b)
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
    : []

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts)
      return date.toLocaleString()
    } catch {
      return ts
    }
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
                Config Validation
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Validate your project configuration and identify issues
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button onClick={runValidation} variant="primary" disabled={loading}>
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Validating...' : 'Run Validation'}
              </Button>
              {lastValidated && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-3 w-3" />
                  Last checked: {formatTimestamp(lastValidated)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Validation Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !validationData && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Running configuration validation...
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Executing nself config validate
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {validationData && (
          <div className="space-y-6">
            {/* Health Score Banner */}
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center gap-4">
                <HealthBadge summary={validationData.summary} />
                {loading && <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {validationData.summary.passed} passed
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {validationData.summary.failed} failed
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {validationData.summary.warnings} warnings
                  </span>
                </div>
              </div>
            </div>

            {/* Category Groups */}
            <div className="space-y-4">
              {sortedCategories.map((category) => {
                const categoryChecks = validationData.checks.filter((c) => c.category === category)
                const categorySummary = validationData.categories[category]
                // Auto-open categories with failures
                const hasProblems = categorySummary.failed > 0 || categorySummary.warnings > 0

                return (
                  <CategoryGroup
                    key={category}
                    category={category}
                    checks={categoryChecks}
                    categorySummary={categorySummary}
                    defaultOpen={hasProblems}
                  />
                )
              })}
            </div>

            {/* Raw Output (collapsible) */}
            {validationData.rawOutput && (
              <details className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <summary className="cursor-pointer p-4 text-sm font-medium text-zinc-700 transition-colors select-none hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50">
                  View Raw CLI Output
                </summary>
                <div className="border-t border-zinc-100 p-4 dark:border-zinc-700">
                  <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-100">
                    {validationData.rawOutput}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function ConfigValidatePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ConfigValidateContent />
    </Suspense>
  )
}
