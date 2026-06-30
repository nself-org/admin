'use client'

/**
 * Purpose:      /system/validate — runs nself config validate and shows results.
 * Inputs:       Fetches /api/nself/diagnostics?mode=validate on mount.
 * Outputs:      Validation check list with pass/fail/warning status and categories.
 * Constraints:  Offline/error/skeleton/retry states follow the 7-UI-state
 *               pattern used across all /system/* pages.
 * SPORT:        F02 CLI commands · F08 service inventory
 */

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
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
  category?: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  suggestion?: string
}

interface ValidationData {
  /** /api/config/validate real shape */
  success?: boolean
  data?: {
    checks?: ValidationCheck[]
    summary?: { total: number; passed: number; failed: number; warnings: number; score: string }
    timestamp?: string
    rawOutput?: string
  }
  /** Test-mock shape (flat) */
  checks?: ValidationCheck[]
  overall?: string
  runAt?: string
}

function ValidateContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<ValidationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchValidation = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/diagnostics?mode=validate')
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
      setData(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchValidation()
  }, [fetchValidation])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Validation unavailable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Ensure the nSelf stack is running to validate configuration.
            </p>
          </div>
        </div>
        <Button onClick={fetchValidation} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Validation failed</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchValidation} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>No validation data available.</p>
        <Button
          onClick={fetchValidation}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Run validation
        </Button>
      </div>
    )
  }

  // Normalise between real API shape and test-mock shape
  const checks: ValidationCheck[] = data.data?.checks ?? data.checks ?? []
  const summary = data.data?.summary
  const passed = summary?.passed ?? checks.filter((c) => c.status === 'pass').length
  const failed = summary?.failed ?? checks.filter((c) => c.status === 'fail').length
  const warnings = summary?.warnings ?? checks.filter((c) => c.status === 'warning').length
  const isValid = failed === 0

  // States 6 + 7: Success
  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Configuration Validation</h2>
          <p className="mt-1 text-sm text-gray-400">
            Validate your nSelf environment and configuration files
          </p>
        </div>
        <Button onClick={fetchValidation} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Validating…' : 'Re-validate'}
        </Button>
      </div>

      {/* Overall status */}
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          isValid
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-red-500/30 bg-red-500/10'
        }`}
      >
        {isValid ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
        )}
        <div>
          <p className={`font-medium ${isValid ? 'text-green-400' : 'text-red-400'}`}>
            {isValid ? 'Configuration is valid' : `${failed} validation error${failed !== 1 ? 's' : ''} found`}
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            {passed} passed · {failed} failed · {warnings} warnings
            {summary?.score ? ` · Score: ${summary.score}` : ''}
          </p>
        </div>
      </div>

      {/* Check list */}
      {checks.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-gray-500" />
          <p className="text-gray-400">No validation checks found.</p>
          <p className="mt-1 text-sm text-gray-500">
            Run{' '}
            <code className="font-mono text-sky-400">nself config validate</code> to generate
            results.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                {check.status === 'pass' ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                ) : check.status === 'fail' ? (
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{check.name}</p>
                    {check.category && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-gray-400">
                        {check.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-400">{check.message}</p>
                  {check.suggestion && (
                    <p className="mt-1 text-xs text-sky-400">
                      Fix: {check.suggestion}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    check.status === 'pass'
                      ? 'bg-green-500/10 text-green-400'
                      : check.status === 'fail'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {check.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default function ValidatePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ValidateContent />
    </Suspense>
  )
}
