'use client'

import { PageShell } from '@/components/PageShell'
import { FormSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Gauge, Loader2, RefreshCw, RotateCcw, Terminal } from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EndpointCategory {
  name: string
  key: string
  description: string
  requestsPerMinute: number
  burst: number
  currentUsage: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENDPOINT_CATEGORIES: EndpointCategory[] = [
  {
    name: 'Authentication',
    key: 'auth',
    description: 'Login, signup, password reset, token refresh',
    requestsPerMinute: 30,
    burst: 10,
    currentUsage: 0,
  },
  {
    name: 'API',
    key: 'api',
    description: 'General API endpoints, GraphQL queries',
    requestsPerMinute: 120,
    burst: 30,
    currentUsage: 0,
  },
  {
    name: 'Webhooks',
    key: 'webhooks',
    description: 'Webhook delivery and management endpoints',
    requestsPerMinute: 60,
    burst: 15,
    currentUsage: 0,
  },
  {
    name: 'Admin',
    key: 'admin',
    description: 'Admin panel and management operations',
    requestsPerMinute: 60,
    burst: 20,
    currentUsage: 0,
  },
]

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function RateLimitsContent() {
  const [loading, setLoading] = useState(false)
  const [configOutput, setConfigOutput] = useState<string | null>(null)
  const [statusOutput, setStatusOutput] = useState<string | null>(null)
  const [cliOutput, setCliOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resettingEndpoint, setResettingEndpoint] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<string>('nself auth rate-limit config')

  // Fetch rate limit configuration
  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself auth rate-limit config')
    try {
      const res = await fetch('/api/auth/rate-limit/config')
      const json = await res.json()
      if (json.success) {
        setConfigOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to fetch configuration')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch rate limit status
  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself auth rate-limit status')
    try {
      const res = await fetch('/api/auth/rate-limit/status')
      const json = await res.json()
      if (json.success) {
        setStatusOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to fetch status')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset rate limits
  const resetRateLimits = useCallback(async (endpoint?: string) => {
    const endpointKey = endpoint || 'all'
    setResettingEndpoint(endpointKey)
    setError(null)
    setLastCommand(
      endpoint
        ? `nself auth rate-limit reset --endpoint=${endpoint}`
        : 'nself auth rate-limit reset'
    )
    try {
      const res = await fetch('/api/auth/rate-limit/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint ? { endpoint } : {}),
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Rate limits reset successfully')
      } else {
        setError(json.error || 'Failed to reset rate limits')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setResettingEndpoint(null)
    }
  }, [])

  // Calculate usage percentage for display
  const getUsagePercent = (current: number, max: number): number => {
    if (max <= 0) return 0
    return Math.min(Math.round((current / max) * 100), 100)
  }

  const getUsageColor = (percent: number): string => {
    if (percent >= 90) return 'text-red-600 dark:text-red-400'
    if (percent >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  return (
    <PageShell
      title="Rate Limits"
      description="View and manage API rate limiting configuration per endpoint category"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfig}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Load Config
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gauge className="mr-2 h-4 w-4" />
            )}
            Check Status
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => resetRateLimits()}
            disabled={resettingEndpoint !== null}
          >
            {resettingEndpoint === 'all' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Reset All
          </Button>
        </div>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Config and Status Output Cards */}
      {(configOutput || statusOutput) && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {configOutput && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuration</CardTitle>
                <CardDescription>Current rate limit configuration from CLI</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <pre className="text-xs text-zinc-700 dark:text-zinc-300">{configOutput}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          {statusOutput && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Live Status</CardTitle>
                <CardDescription>Current usage across all endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <pre className="text-xs text-zinc-700 dark:text-zinc-300">{statusOutput}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Endpoint Category Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {ENDPOINT_CATEGORIES.map((cat) => {
          const percent = getUsagePercent(cat.currentUsage, cat.requestsPerMinute)
          const colorClass = getUsageColor(percent)
          const isResetting = resettingEndpoint === cat.key

          return (
            <Card key={cat.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                    <Badge variant="secondary">{cat.key}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetRateLimits(cat.key)}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Limits info */}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Requests/min</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {cat.requestsPerMinute}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Burst limit</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {cat.burst}
                    </span>
                  </div>

                  {/* Usage bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Current usage</span>
                      <span className={`font-medium ${colorClass}`}>
                        {cat.currentUsage}/{cat.requestsPerMinute}
                      </span>
                    </div>
                    <Progress value={percent} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* CLI Command Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">CLI Command</CardTitle>
          </div>
          <CardDescription>Command executed against the nself CLI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 p-4">
            <div className="mb-2 font-mono text-sm text-emerald-400">$ {lastCommand}</div>
            {cliOutput && (
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-xs text-zinc-300">{cliOutput}</pre>
              </ScrollArea>
            )}
            {!cliOutput && (
              <p className="font-mono text-xs text-zinc-500">Run a command to see output here</p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

export default function RateLimitsPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <RateLimitsContent />
    </Suspense>
  )
}
