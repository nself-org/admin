'use client'

import {
  Eye,
  EyeOff,
  KeyRound,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { HealthBadge } from './HealthBadge'
import { WebhookEndpoint } from './types'

interface EndpointListProps {
  endpoints: WebhookEndpoint[]
  isLoading?: boolean
  onToggle: (id: string) => Promise<void>
  onRotateSecret: (id: string) => Promise<void>
  onTest: (
    id: string,
  ) => Promise<{ success: boolean; response?: string; error?: string }>
  onDelete: (id: string) => Promise<void>
}

/**
 * EndpointList renders the webhook endpoint table with per-endpoint health badge,
 * enable/disable toggle, secret rotation, and test-fire actions.
 */
export function EndpointList({
  endpoints,
  isLoading = false,
  onToggle,
  onRotateSecret,
  onTest,
  onDelete,
}: EndpointListProps) {
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)
  const [pendingRotate, setPendingRotate] = useState<string | null>(null)
  const [pendingTest, setPendingTest] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<
    Record<string, { success: boolean; msg: string }>
  >({})
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})

  const handleToggle = async (id: string) => {
    setPendingToggle(id)
    try {
      await onToggle(id)
    } finally {
      setPendingToggle(null)
    }
  }

  const handleRotate = async (id: string) => {
    setPendingRotate(id)
    try {
      await onRotateSecret(id)
    } finally {
      setPendingRotate(null)
    }
  }

  const handleTest = async (id: string) => {
    setPendingTest(id)
    setTestResult((r) => ({ ...r, [id]: { success: false, msg: '' } }))
    try {
      const result = await onTest(id)
      setTestResult((r) => ({
        ...r,
        [id]: {
          success: result.success,
          msg: result.success
            ? (result.response ?? 'OK')
            : (result.error ?? 'Failed'),
        },
      }))
    } finally {
      setPendingTest(null)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    )
  }

  if (endpoints.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No endpoints configured. Create one above.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {endpoints.map((ep) => (
        <div
          key={ep.id}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: name + url + health */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="truncate font-semibold text-zinc-900 dark:text-white">
                  {ep.name}
                </span>
                <HealthBadge
                  score={ep.healthScore}
                  circuitState={ep.circuitState}
                />
                {!ep.enabled && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Disabled
                  </span>
                )}
              </div>
              <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {ep.url}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ep.events.map((ev) => (
                  <span
                    key={ev}
                    className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-400"
                  >
                    {ev}
                  </span>
                ))}
              </div>

              {/* Signing secret row */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-zinc-400">Secret:</span>
                <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {showSecret[ep.id]
                    ? ep.signingSecretMasked
                    : '••••••••••••••••'}
                </span>
                <button
                  onClick={() =>
                    setShowSecret((s) => ({ ...s, [ep.id]: !s[ep.id] }))
                  }
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  title="Toggle secret visibility"
                >
                  {showSecret[ep.id] ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => handleToggle(ep.id)}
                disabled={pendingToggle === ep.id}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                title={ep.enabled ? 'Disable endpoint' : 'Enable endpoint'}
              >
                {ep.enabled ? (
                  <ToggleRight className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => handleRotate(ep.id)}
                disabled={pendingRotate === ep.id}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                title="Rotate signing secret (old secret valid for 60s)"
              >
                <KeyRound
                  className={`h-5 w-5 ${pendingRotate === ep.id ? 'animate-pulse' : ''}`}
                />
              </button>

              <button
                onClick={() => handleTest(ep.id)}
                disabled={pendingTest === ep.id}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                title="Send test event"
              >
                <Send
                  className={`h-5 w-5 ${pendingTest === ep.id ? 'animate-pulse' : ''}`}
                />
              </button>

              <button
                onClick={() => onDelete(ep.id)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                title="Delete endpoint"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Test result inline */}
          {testResult[ep.id]?.msg && (
            <div
              className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                testResult[ep.id].success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
              }`}
            >
              <span className="font-semibold">
                {testResult[ep.id].success ? 'Test sent: ' : 'Test failed: '}
              </span>
              <span className="font-mono">{testResult[ep.id].msg}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
