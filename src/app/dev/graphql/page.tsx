'use client'

import { Button } from '@/components/Button'
import { CodeEditorSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Code2,
  Info,
  Play,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface HasuraStats {
  tables: number
  views: number
  functions: number
  relationships: number
  permissions: number
  endpoint: string
}

interface QueryResult {
  data?: unknown
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>
}

const DEFAULT_QUERY = `# Read-only queries only — mutations are blocked
query {
  __typename
}`

function getCsrf(): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('nself-csrf='))
      ?.split('=')[1] ?? ''
  )
}

function GraphQLContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [stats, setStats] = useState<HasuraStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [variables, setVariables] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [showVars, setShowVars] = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [schemaData, setSchemaData] = useState<string | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)

  const resultRef = useRef<HTMLPreElement>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/graphql/hasura?action=stats')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${response.status}`
        if (
          msg.toLowerCase().includes('docker') ||
          msg.toLowerCase().includes('connect') ||
          msg.toLowerCase().includes('hasura')
        ) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setStats(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const runQuery = useCallback(async () => {
    setRunning(true)
    setRunError(null)
    setResult(null)
    try {
      let parsedVars: Record<string, unknown> | undefined
      if (variables.trim()) {
        try {
          parsedVars = JSON.parse(variables)
        } catch {
          setRunError('Variables must be valid JSON')
          setRunning(false)
          return
        }
      }
      const response = await fetch('/api/graphql/hasura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrf(),
        },
        body: JSON.stringify({
          action: 'execute',
          query,
          variables: parsedVars,
        }),
      })
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      const json = await response.json()
      if (!response.ok) {
        setRunError(json?.error ?? `Request failed: ${response.status}`)
        return
      }
      setResult(json)
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    } catch {
      setRunError('Network error — is Hasura reachable?')
    } finally {
      setRunning(false)
    }
  }, [query, variables])

  const loadSchema = useCallback(async () => {
    setSchemaLoading(true)
    try {
      const response = await fetch('/api/graphql/hasura?action=tables')
      if (response.ok) {
        const json = await response.json()
        setSchemaData(JSON.stringify(json, null, 2))
      } else {
        setSchemaData('Failed to load schema')
      }
    } catch {
      setSchemaData('Network error loading schema')
    } finally {
      setSchemaLoading(false)
    }
  }, [])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <CodeEditorSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach Hasura</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Make sure the nself stack is running before using the GraphQL explorer.
            </p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to connect to Hasura</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!stats) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No Hasura connection data available.</p>
        <Button onClick={fetchStats} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Connect
        </Button>
      </div>
    )
  }

  // States 6 + 7: Success
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">GraphQL Explorer</h2>
          <p className="text-sm text-gray-400 mt-1">
            {stats.endpoint} &mdash; {stats.tables} tables &middot; {stats.relationships} relationships
          </p>
        </div>
        <Button onClick={fetchStats} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Read-only notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
        <Info className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sky-300">
          Read-only mode &mdash; mutations, subscriptions, and DELETE operations are blocked. Only{' '}
          <code className="font-mono">query</code> operations and introspection are allowed.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tables', value: stats.tables },
          { label: 'Views', value: stats.views },
          { label: 'Functions', value: stats.functions },
          { label: 'Relationships', value: stats.relationships },
          { label: 'Permissions', value: stats.permissions },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center"
          >
            <p className="text-lg font-semibold text-white">{item.value}</p>
            <p className="text-xs text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Query editor */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        {/* Query toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="text-xs font-mono text-gray-400">Query</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVars((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Variables
              {showVars ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={() => {
                const next = !showSchema
                setShowSchema(next)
                if (next && !schemaData) loadSchema()
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Schema
              {showSchema ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Query textarea */}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          className="w-full bg-black/40 text-sm text-gray-200 font-mono p-4 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500/50 min-h-[200px]"
          placeholder="Enter your GraphQL query here…"
        />

        {/* Variables panel */}
        {showVars && (
          <div className="border-t border-white/10">
            <div className="px-4 py-2 bg-white/5 border-b border-white/5">
              <span className="text-xs font-mono text-gray-400">Variables (JSON)</span>
            </div>
            <textarea
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              spellCheck={false}
              className="w-full bg-black/40 text-sm text-gray-200 font-mono p-4 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500/50 min-h-[100px]"
              placeholder='{ "id": "..." }'
            />
          </div>
        )}

        {/* Schema panel */}
        {showSchema && (
          <div className="border-t border-white/10">
            <div className="px-4 py-2 bg-white/5 border-b border-white/5">
              <span className="text-xs font-mono text-gray-400">Schema (tables)</span>
            </div>
            {schemaLoading ? (
              <div className="p-4 text-xs text-gray-500 font-mono">Loading…</div>
            ) : schemaData ? (
              <pre className="p-4 text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-64 bg-black/40">
                {schemaData}
              </pre>
            ) : null}
          </div>
        )}

        {/* Run bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-t border-white/10">
          {runError ? (
            <p className="text-xs text-red-400 flex-1 mr-3">{runError}</p>
          ) : (
            <span className="text-xs text-gray-600">Write a query above and click Run</span>
          )}
          <Button
            onClick={runQuery}
            disabled={running || !query.trim()}
            variant="primary"
            size="sm"
          >
            <Play className={`h-4 w-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Running…' : 'Run Query'}
          </Button>
        </div>
      </div>

      {/* Results panel */}
      {result && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
            <span className="text-xs font-mono text-gray-400">Result</span>
            {result.errors && result.errors.length > 0 && (
              <span className="text-xs text-red-400">
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <pre
            ref={resultRef}
            className="p-4 text-xs text-gray-200 font-mono whitespace-pre-wrap overflow-auto max-h-96 bg-black/40"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function GraphQLPage() {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <GraphQLContent />
    </Suspense>
  )
}
