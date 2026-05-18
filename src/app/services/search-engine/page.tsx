'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Settings,
  Terminal,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEARCH_ENGINES = [
  {
    value: 'meilisearch',
    label: 'MeiliSearch',
    description: 'Lightning fast, typo-tolerant search engine',
  },
  {
    value: 'typesense',
    label: 'Typesense',
    description: 'Open source, typo-tolerant search engine',
  },
  {
    value: 'sonic',
    label: 'Sonic',
    description: 'Fast, lightweight search backend',
  },
  {
    value: 'elasticsearch',
    label: 'ElasticSearch',
    description: 'Distributed search and analytics engine',
  },
  {
    value: 'algolia',
    label: 'Algolia',
    description: 'Hosted search API with powerful relevance tuning',
  },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SearchEngineContent() {
  const [selectedEngine, setSelectedEngine] = useState('meilisearch')
  const [testQuery, setTestQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [lastCommand, setLastCommand] = useState('')
  const [configOutput, setConfigOutput] = useState('')

  // ---------------------------------------------------------------------------
  // Initialize search engine
  // ---------------------------------------------------------------------------

  const handleInit = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand(`nself service search init --engine=${selectedEngine}`)

    try {
      const res = await fetch('/api/services/search-engine/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: selectedEngine }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Initialization failed')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Search engine initialized successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [selectedEngine])

  // ---------------------------------------------------------------------------
  // Run indexing
  // ---------------------------------------------------------------------------

  const handleIndex = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service search index')

    try {
      const res = await fetch('/api/services/search-engine/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Indexing failed')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Indexing completed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Test query
  // ---------------------------------------------------------------------------

  const handleQuery = useCallback(async () => {
    if (!testQuery.trim()) return

    setLoading(true)
    setError(null)
    setLastCommand(`nself service search query --q="${testQuery}"`)

    try {
      const res = await fetch('/api/services/search-engine/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim() }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Query failed')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'No results found.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [testQuery])

  // ---------------------------------------------------------------------------
  // Fetch configuration
  // ---------------------------------------------------------------------------

  const handleFetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service search config')

    try {
      const res = await fetch('/api/services/search-engine/config')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to fetch configuration')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || 'No configuration data available.'
      setConfigOutput(rawOutput)
      setOutput(rawOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const currentEngineInfo = SEARCH_ENGINES.find((e) => e.value === selectedEngine)

  return (
    <PageShell
      title="Search Engine"
      description="Initialize, configure, and manage your project search engine."
    >
      <div className="space-y-6">
        {/* Engine Selector & Init */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Engine Selection
              </CardTitle>
              <CardDescription>Choose and initialize your search engine backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Search Engine
                </label>
                <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_ENGINES.map((engine) => (
                      <SelectItem key={engine.value} value={engine.value}>
                        {engine.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentEngineInfo && (
                  <p className="mt-2 text-xs text-zinc-500">{currentEngineInfo.description}</p>
                )}
              </div>
              <Button onClick={handleInit} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Initialize Engine
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Index Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Index Management
              </CardTitle>
              <CardDescription>Build and rebuild search indexes for your data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Indexes data from your database into the search engine for fast full-text
                    search.
                  </span>
                </div>
              </div>
              <Button onClick={handleIndex} disabled={loading} variant="outline" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Rebuild Indexes
                  </>
                )}
              </Button>
              <Button
                onClick={handleFetchConfig}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                View Configuration
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test Query */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Test Query
            </CardTitle>
            <CardDescription>
              Run a test search query against your configured engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuery()
                }}
                placeholder="Enter search query..."
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
              />
              <Button onClick={handleQuery} disabled={loading || !testQuery.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Display */}
        {configOutput && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-md bg-zinc-100 p-4 font-mono text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {configOutput}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* CLI Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Output
            </CardTitle>
            <CardDescription>
              Command preview and execution output from the nself CLI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastCommand && (
              <div className="mb-3 rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                $ {lastCommand}
              </div>
            )}
            <ScrollArea className="h-48 w-full rounded-md border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-700">
              <pre className="font-mono text-sm text-green-400">
                {output || 'No output yet. Initialize an engine to get started.'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default function SearchEnginePage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <SearchEngineContent />
    </Suspense>
  )
}
