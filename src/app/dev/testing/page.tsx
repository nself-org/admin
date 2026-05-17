'use client'

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Terminal,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface TestSuite {
  id: string
  name: string
  description: string
  command: string
  category: 'unit' | 'integration' | 'e2e' | 'smoke'
}

interface TestResult {
  suiteId: string
  status: 'running' | 'passed' | 'failed' | 'error'
  output: string
  durationMs: number
  passCount: number
  failCount: number
  startedAt: string
}

interface TestingData {
  suites: TestSuite[]
  lastRun?: { runAt: string; totalPassed: number; totalFailed: number }
}

const CATEGORY_STYLES: Record<TestSuite['category'], string> = {
  unit: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  integration: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  e2e: 'text-green-400 bg-green-500/10 border-green-500/30',
  smoke: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
}

// Built-in nself test suites
const BUILTIN_SUITES: TestSuite[] = [
  {
    id: 'smoke-status',
    name: 'Stack Smoke Test',
    description: 'Verify all core services respond',
    command: 'nself doctor',
    category: 'smoke',
  },
  {
    id: 'smoke-urls',
    name: 'URL Reachability',
    description: 'Check all service URLs resolve',
    command: 'nself urls',
    category: 'smoke',
  },
  {
    id: 'smoke-health',
    name: 'Health Check',
    description: 'Run nself health checks on all services',
    command: 'nself health --all',
    category: 'smoke',
  },
  {
    id: 'integration-db',
    name: 'Database Connectivity',
    description: 'Test Postgres connection and Hasura metadata',
    command: 'nself db status',
    category: 'integration',
  },
  {
    id: 'integration-plugins',
    name: 'Plugin Health',
    description: 'Verify all installed plugins are responsive',
    command: 'nself plugin list',
    category: 'integration',
  },
]

function TestingContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<TestingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [runningAll, setRunningAll] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/nself/diagnostics')
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${res.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      // Merge with built-in suites
      setData({ suites: BUILTIN_SUITES })
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function runSuite(suite: TestSuite) {
    const startedAt = new Date().toISOString()
    setResults((prev) => ({
      ...prev,
      [suite.id]: {
        suiteId: suite.id,
        status: 'running',
        output: '',
        durationMs: 0,
        passCount: 0,
        failCount: 0,
        startedAt,
      },
    }))
    setExpanded((prev) => ({ ...prev, [suite.id]: true }))

    const t0 = Date.now()
    const csrf =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1] ?? ''

    // Parse command to extract subcommand + args
    const parts = suite.command.trim().split(/\s+/)
    const subcommand = parts[1] ?? 'status'
    const args = parts.slice(2)

    try {
      const res = await fetch('/api/ws/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ command: subcommand, args }),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let outputLines: string[] = []
      let exitCode: number | null = null

      if (reader) {
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const chunks = buf.split('\n\n')
          buf = chunks.pop() ?? ''
          for (const chunk of chunks) {
            const lines = chunk.split('\n')
            let evType = ''
            let evData = ''
            for (const line of lines) {
              if (line.startsWith('event: ')) evType = line.slice(7)
              if (line.startsWith('data: ')) {
                try { evData = JSON.parse(line.slice(6)) } catch { evData = line.slice(6) }
              }
            }
            if (evType === 'stdout' || evType === 'stderr') {
              if (evData) outputLines.push(evData)
            }
            if (evType === 'exit') {
              try { exitCode = JSON.parse(evData).code } catch { exitCode = 0 }
            }
          }
        }
      }

      const durationMs = Date.now() - t0
      const output = outputLines.filter(Boolean).join('\n')
      const passed = exitCode === 0
      setResults((prev) => ({
        ...prev,
        [suite.id]: {
          suiteId: suite.id,
          status: passed ? 'passed' : 'failed',
          output,
          durationMs,
          passCount: passed ? 1 : 0,
          failCount: passed ? 0 : 1,
          startedAt,
        },
      }))
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [suite.id]: {
          suiteId: suite.id,
          status: 'error',
          output: err instanceof Error ? err.message : 'Test failed to run',
          durationMs: Date.now() - t0,
          passCount: 0,
          failCount: 1,
          startedAt,
        },
      }))
    }
  }

  async function runAll() {
    if (!data) return
    setRunningAll(true)
    for (const suite of data.suites) {
      await runSuite(suite)
    }
    setRunningAll(false)
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself services</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Testing utilities require a running nself stack.
            </p>
          </div>
        </div>
        <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load test suites</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No test suites available.</p>
        <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load
        </Button>
      </div>
    )
  }

  const suites = data.suites
  const totalPassed = Object.values(results).filter((r) => r.status === 'passed').length
  const totalFailed = Object.values(results).filter((r) => r.status === 'failed' || r.status === 'error').length
  const anyRunning = Object.values(results).some((r) => r.status === 'running')

  // States 6+7: success
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Testing Utilities</h2>
          <p className="text-sm text-gray-400 mt-1">
            {suites.length} test suite{suites.length !== 1 ? 's' : ''} available
            {Object.keys(results).length > 0 && (
              <span className="ml-2">
                {totalPassed > 0 && <span className="text-green-400">{totalPassed} passed</span>}
                {totalFailed > 0 && (
                  <span className={`text-red-400 ${totalPassed > 0 ? ' · ' : ''}`}>
                    {totalFailed} failed
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runAll} disabled={runningAll || anyRunning} size="sm">
            {runningAll || anyRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Terminal className="h-4 w-4 mr-2" />
            )}
            {runningAll ? 'Running…' : 'Run All'}
          </Button>
          <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm">
            {/* State 2: refresh spinner */}
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Suite list */}
      <div className="space-y-2">
        {suites.map((suite) => {
          const result = results[suite.id]
          const isRunning = result?.status === 'running'
          const isExpanded = expanded[suite.id]
          return (
            <div key={suite.id} className="rounded-lg border border-white/10 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {!result && <Terminal className="h-4 w-4 text-gray-500" />}
                  {result?.status === 'running' && <Loader2 className="h-4 w-4 text-sky-400 animate-spin" />}
                  {result?.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-400" />}
                  {(result?.status === 'failed' || result?.status === 'error') && (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{suite.name}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border font-mono ${CATEGORY_STYLES[suite.category]}`}
                    >
                      {suite.category}
                    </span>
                    {result && result.status !== 'running' && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {result.durationMs}ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{suite.description}</p>
                  <code className="text-xs text-gray-600 font-mono">{suite.command}</code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => runSuite(suite)}
                    disabled={isRunning || runningAll}
                    variant="secondary"
                    size="sm"
                  >
                    {isRunning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Terminal className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5 text-xs">{isRunning ? 'Running…' : 'Run'}</span>
                  </Button>
                  {result?.output && (
                    <button
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [suite.id]: !prev[suite.id] }))
                      }
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Output panel */}
              {result?.output && isExpanded && (
                <div className="border-t border-white/10 bg-black/20 px-4 py-3">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">
                    {result.output}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TestingContent />
    </Suspense>
  )
}
