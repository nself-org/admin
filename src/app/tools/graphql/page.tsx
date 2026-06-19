'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { CodeEditorSkeleton } from '@/components/skeletons'
import {
  Activity,
  Box,
  Code,
  Database,
  Download,
  Edit3,
  GitBranch,
  Hash,
  Key,
  Layers,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Type,
  Upload,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

interface GraphQLQuery {
  id: string
  name: string
  query: string
  variables?: string
  headers?: Record<string, string>
  lastExecuted?: string
  executionTime?: number
  favorite: boolean
}

interface GraphQLType {
  name: string
  kind: 'OBJECT' | 'SCALAR' | 'ENUM' | 'INPUT_OBJECT' | 'INTERFACE' | 'UNION'
  description?: string
  fields?: GraphQLField[]
  enumValues?: { name: string; description?: string }[]
  inputFields?: GraphQLField[]
}

interface GraphQLField {
  name: string
  type: string
  description?: string
  args?: { name: string; type: string; description?: string }[]
  isDeprecated?: boolean
  deprecationReason?: string
}

interface QueryResult {
  data?: any
  errors?: Array<{ message: string; locations?: any[]; path?: any[] }>
  extensions?: any
}

const EMPTY_QUERIES: GraphQLQuery[] = []
const EMPTY_SCHEMA: GraphQLType[] = []

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function QueryCard({
  query,
  onSelect,
  onAction,
  isActive,
}: {
  query: GraphQLQuery
  onSelect: () => void
  onAction: (action: string, queryId: string) => void
  isActive: boolean
}) {
  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
      }`}
      onClick={onSelect}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{query.name}</h3>
          {query.favorite && <span className="text-yellow-500">★</span>}
        </div>
        <div className="group relative">
          <button
            onClick={(e) => e.stopPropagation()}
            className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
          <div className="invisible absolute right-0 z-10 mt-1 w-32 rounded-lg border border-zinc-200 bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => onAction('favorite', query.id)}
              className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              {query.favorite ? 'Unfavorite' : 'Favorite'}
            </button>
            <button
              onClick={() => onAction('duplicate', query.id)}
              className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              Duplicate
            </button>
            <button
              onClick={() => onAction('delete', query.id)}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <p className="mb-2 font-mono text-xs text-zinc-500">
        {(query.query.split('\n')[0] ?? '').trim()}...
      </p>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{query.lastExecuted ? formatDate(query.lastExecuted) : 'Never executed'}</span>
        {query.executionTime && <span>{query.executionTime}ms</span>}
      </div>
    </div>
  )
}

function SchemaExplorer({
  schema,
  onTypeSelect,
}: {
  schema: GraphQLType[]
  onTypeSelect: (type: GraphQLType) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKind, setSelectedKind] = useState<string>('all')

  const filteredTypes = schema.filter((type) => {
    if (selectedKind !== 'all' && type.kind !== selectedKind) return false
    if (searchQuery) {
      return (
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  const getTypeIcon = (kind: string) => {
    switch (kind) {
      case 'OBJECT':
        return Box
      case 'SCALAR':
        return Type
      case 'ENUM':
        return Hash
      case 'INPUT_OBJECT':
        return Key
      case 'INTERFACE':
        return Layers
      case 'UNION':
        return GitBranch
      default:
        return Box
    }
  }

  const getTypeColor = (kind: string) => {
    switch (kind) {
      case 'OBJECT':
        return 'text-blue-600 dark:text-blue-400'
      case 'SCALAR':
        return 'text-green-600 dark:text-green-400'
      case 'ENUM':
        return 'text-sky-500 dark:text-sky-400'
      case 'INPUT_OBJECT':
        return 'text-orange-600 dark:text-orange-400'
      case 'INTERFACE':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'UNION':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-zinc-600 dark:text-zinc-400'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <select
          value={selectedKind}
          onChange={(e) => setSelectedKind(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="all">All Types</option>
          <option value="OBJECT">Objects</option>
          <option value="SCALAR">Scalars</option>
          <option value="ENUM">Enums</option>
          <option value="INPUT_OBJECT">Inputs</option>
          <option value="INTERFACE">Interfaces</option>
          <option value="UNION">Unions</option>
        </select>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {filteredTypes.map((type) => {
          const Icon = getTypeIcon(type.kind)
          const colorClass = getTypeColor(type.kind)

          return (
            <div
              key={type.name}
              className="cursor-pointer rounded-lg border border-zinc-200 p-3 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              onClick={() => onTypeSelect(type)}
            >
              <div className="mb-1 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${colorClass}`} />
                <span className="text-sm font-medium">{type.name}</span>
                <span className={`rounded px-2 py-1 text-xs ${colorClass} bg-opacity-10`}>
                  {type.kind}
                </span>
              </div>
              {type.description && <p className="ml-6 text-xs text-zinc-500">{type.description}</p>}
              {type.fields && (
                <p className="mt-1 ml-6 text-xs text-zinc-400">{type.fields.length} fields</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TypeDetails({ type }: { type: GraphQLType }) {
  const getTypeIcon = (kind: string) => {
    switch (kind) {
      case 'OBJECT':
        return Box
      case 'SCALAR':
        return Type
      case 'ENUM':
        return Hash
      case 'INPUT_OBJECT':
        return Key
      case 'INTERFACE':
        return Layers
      case 'UNION':
        return GitBranch
      default:
        return Box
    }
  }

  const Icon = getTypeIcon(type.kind)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{type.name}</h2>
          <span className="text-sm text-zinc-500">{type.kind}</span>
        </div>
      </div>

      {type.description && <p className="text-zinc-600 dark:text-zinc-400">{type.description}</p>}

      {type.fields && (
        <div>
          <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">Fields</h3>
          <div className="space-y-2">
            {type.fields.map((field) => (
              <div key={field.name} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{field.name}</span>
                    <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {field.type}
                    </span>
                  </div>
                  {field.isDeprecated && (
                    <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-500 dark:bg-red-900/20">
                      Deprecated
                    </span>
                  )}
                </div>
                {field.description && (
                  <p className="mb-2 text-xs text-zinc-500">{field.description}</p>
                )}
                {field.args && field.args.length > 0 && (
                  <div className="text-xs">
                    <span className="text-zinc-500">Arguments: </span>
                    {field.args.map((arg, index) => (
                      <span key={arg.name} className="font-mono">
                        {arg.name}: {arg.type}
                        {index < field.args!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
                {field.deprecationReason && (
                  <p className="mt-1 text-xs text-red-500">Deprecated: {field.deprecationReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {type.enumValues && (
        <div>
          <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">Values</h3>
          <div className="space-y-2">
            {type.enumValues.map((value) => (
              <div key={value.name} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <div className="font-mono text-sm font-medium">{value.name}</div>
                {value.description && (
                  <p className="mt-1 text-xs text-zinc-500">{value.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QueryResult({ result, loading }: { result: QueryResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Executing query...</span>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center p-8 text-zinc-500">
        <div className="text-center">
          <Code className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>Execute a query to see results</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {result.errors && result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <h3 className="mb-2 font-medium text-red-800 dark:text-red-300">Errors</h3>
          {result.errors.map((error, index) => (
            <div key={index} className="text-sm text-red-700 dark:text-red-400">
              {error.message}
              {error.path && <span className="ml-2 text-red-500">at {error.path.join('.')}</span>}
            </div>
          ))}
        </div>
      )}

      {result.data && (
        <div>
          <h3 className="mb-2 font-medium text-zinc-900 dark:text-white">Data</h3>
          <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}

      {result.extensions && (
        <div>
          <h3 className="mb-2 font-medium text-zinc-900 dark:text-white">Extensions</h3>
          <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
            {JSON.stringify(result.extensions, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function GraphQLToolsContent() {
  const [queries, setQueries] = useState<GraphQLQuery[]>(EMPTY_QUERIES)
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'query' | 'schema'>('query')
  const [schemaTab, setSchemaTab] = useState<'explorer' | 'details'>('explorer')
  const [selectedType, setSelectedType] = useState<GraphQLType | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [variables, setVariables] = useState('')
  const [headers, setHeaders] = useState('{}')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showVariables, setShowVariables] = useState(true)
  const [showHeaders, setShowHeaders] = useState(false)

  const activeQuery = queries.find((q) => q.id === activeQueryId)

  useEffect(() => {
    if (activeQuery) {
      setCurrentQuery(activeQuery.query)
      setVariables(activeQuery.variables || '{}')
      setHeaders(JSON.stringify(activeQuery.headers || {}, null, 2))
    }
  }, [activeQuery])

  const handleQueryAction = (action: string, queryId: string) => {
    if (action === 'favorite') {
      setQueries((prev) =>
        prev.map((query) =>
          query.id === queryId ? { ...query, favorite: !query.favorite } : query
        )
      )
    } else if (action === 'duplicate') {
      const query = queries.find((q) => q.id === queryId)
      if (query) {
        const newQuery: GraphQLQuery = {
          ...query,
          id: Date.now().toString(),
          name: `${query.name} (Copy)`,
          favorite: false,
        }
        setQueries((prev) => [...prev, newQuery])
      }
    } else if (action === 'delete') {
      setQueries((prev) => prev.filter((q) => q.id !== queryId))
      if (activeQueryId === queryId && queries.length > 1) {
        const remainingQueries = queries.filter((q) => q.id !== queryId)
        setActiveQueryId(remainingQueries[0]?.id ?? '')
      }
    }
  }

  const handleExecuteQuery = async () => {
    if (!currentQuery.trim()) return
    setLoading(true)
    setQueryResult(null)

    const startTime = Date.now()

    try {
      let parsedVariables: Record<string, unknown> | undefined
      if (variables.trim() && variables.trim() !== '{}') {
        try {
          parsedVariables = JSON.parse(variables)
        } catch {
          setQueryResult({ errors: [{ message: 'Variables JSON is invalid' }] })
          setLoading(false)
          return
        }
      }

      let extraHeaders: Record<string, string> = {}
      if (headers.trim() && headers.trim() !== '{}') {
        try {
          extraHeaders = JSON.parse(headers)
        } catch {
          // Ignore malformed headers JSON — proceed without them
        }
      }

      const resp = await fetch('/api/graphql/hasura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify({
          query: currentQuery,
          variables: parsedVariables,
        }),
      })

      if (resp.status === 401) {
        window.location.href = '/login'
        return
      }

      const result: QueryResult = await resp.json()
      const executionTime = Date.now() - startTime

      setQueryResult(result)

      // Update query execution metadata
      if (activeQuery) {
        setQueries((prev) =>
          prev.map((query) =>
            query.id === activeQueryId
              ? {
                  ...query,
                  lastExecuted: new Date().toISOString(),
                  executionTime,
                }
              : query
          )
        )
      }
    } catch (err) {
      setQueryResult({
        errors: [
          {
            message: err instanceof Error ? err.message : 'Failed to execute query',
          },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveQuery = () => {
    if (activeQuery) {
      setQueries((prev) =>
        prev.map((query) =>
          query.id === activeQueryId
            ? {
                ...query,
                query: currentQuery,
                variables: variables || undefined,
                headers: headers ? JSON.parse(headers) : undefined,
              }
            : query
        )
      )
    }
  }

  const handleCreateQuery = () => {
    const newQuery: GraphQLQuery = {
      id: Date.now().toString(),
      name: `Query ${queries.length + 1}`,
      query: '# Write your GraphQL query here\nquery {\n  \n}',
      variables: '{}',
      favorite: false,
    }

    setQueries((prev) => [...prev, newQuery])
    setActiveQueryId(newQuery.id)
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-[95vw]">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">GraphQL Tools</h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                GraphiQL interface with schema explorer and query management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateQuery}
                variant="filled"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Query
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="mb-6 border-b border-zinc-200 dark:border-zinc-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('query')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'query'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                GraphiQL
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'schema'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Schema Explorer
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'query' && (
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Query List */}
            <div className="w-full lg:w-80">
              <div className="mb-4">
                <h2 className="mb-3 font-semibold text-zinc-900 dark:text-white">Saved Queries</h2>
                <div className="space-y-2">
                  {queries.map((query) => (
                    <QueryCard
                      key={query.id}
                      query={query}
                      onSelect={() => setActiveQueryId(query.id)}
                      onAction={handleQueryAction}
                      isActive={query.id === activeQueryId}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Query Editor */}
            <div className="flex-1">
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                {/* Query Header */}
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {activeQuery?.name || 'New Query'}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowVariables(!showVariables)}
                          className={`rounded px-2 py-1 text-xs ${
                            showVariables
                              ? 'bg-blue-500 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-700'
                          }`}
                        >
                          Variables
                        </button>
                        <button
                          onClick={() => setShowHeaders(!showHeaders)}
                          className={`rounded px-2 py-1 text-xs ${
                            showHeaders ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700'
                          }`}
                        >
                          Headers
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveQuery} variant="outline" className="text-xs">
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        onClick={handleExecuteQuery}
                        disabled={loading}
                        variant="filled"
                        className="text-xs"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        {loading ? 'Running...' : 'Execute'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Query Input */}
                <div className="grid h-96 grid-cols-1 lg:grid-cols-2">
                  <div className="border-r border-zinc-200 dark:border-zinc-700">
                    <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
                      <span className="text-sm font-medium">Query</span>
                    </div>
                    <textarea
                      value={currentQuery}
                      onChange={(e) => setCurrentQuery(e.target.value)}
                      className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
                      placeholder="# Write your GraphQL query here..."
                    />
                  </div>

                  <div className="flex flex-col">
                    {showVariables && (
                      <div className="flex-1 border-b border-zinc-200 dark:border-zinc-700">
                        <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
                          <span className="text-sm font-medium">Variables</span>
                        </div>
                        <textarea
                          value={variables}
                          onChange={(e) => setVariables(e.target.value)}
                          className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
                          placeholder='{\n  "variable": "value"\n}'
                        />
                      </div>
                    )}

                    {showHeaders && (
                      <div className="flex-1">
                        <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
                          <span className="text-sm font-medium">Headers</span>
                        </div>
                        <textarea
                          value={headers}
                          onChange={(e) => setHeaders(e.target.value)}
                          className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
                          placeholder='{\n  "Authorization": "Bearer token"\n}'
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Query Result */}
                <div className="border-t border-zinc-200 dark:border-zinc-700">
                  <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
                    <span className="text-sm font-medium">Result</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <QueryResult result={queryResult} loading={loading} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Schema Explorer */}
            <div className="w-full lg:w-80">
              <div className="mb-4 border-b border-zinc-200 dark:border-zinc-700">
                <nav className="flex">
                  <button
                    onClick={() => setSchemaTab('explorer')}
                    className={`border-b-2 px-4 py-2 text-sm font-medium ${
                      schemaTab === 'explorer'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Explorer
                  </button>
                  <button
                    onClick={() => setSchemaTab('details')}
                    className={`border-b-2 px-4 py-2 text-sm font-medium ${
                      schemaTab === 'details'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Details
                  </button>
                </nav>
              </div>

              {schemaTab === 'explorer' && (
                <SchemaExplorer schema={EMPTY_SCHEMA} onTypeSelect={setSelectedType} />
              )}

              {schemaTab === 'details' && selectedType && <TypeDetails type={selectedType} />}

              {schemaTab === 'details' && !selectedType && (
                <div className="mt-8 text-center text-zinc-500">
                  <Box className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p>Select a type to view details</p>
                </div>
              )}
            </div>

            {/* Schema Visualization */}
            <div className="flex-1">
              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Schema Overview</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      Export SDL
                    </Button>
                    <Button variant="outline" className="text-xs">
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Introspect
                    </Button>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: 'Types', count: EMPTY_SCHEMA.length, icon: Box },
                    {
                      label: 'Queries',
                      count: EMPTY_SCHEMA.find((t) => t.name === 'Query')?.fields?.length || 0,
                      icon: Search,
                    },
                    {
                      label: 'Mutations',
                      count: EMPTY_SCHEMA.find((t) => t.name === 'Mutation')?.fields?.length || 0,
                      icon: Edit3,
                    },
                    { label: 'Subscriptions', count: 0, icon: Activity },
                  ].map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <div key={index} className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.count}</p>
                          </div>
                          <Icon className="h-6 w-6 text-zinc-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {selectedType ? (
                  <TypeDetails type={selectedType} />
                ) : (
                  <div className="text-center text-zinc-500">
                    <Database className="mx-auto mb-4 h-16 w-16 opacity-30" />
                    <p className="mb-2 text-lg font-medium">GraphQL Schema</p>
                    <p>Select a type from the explorer to view its details and relationships</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function GraphQLToolsPage() {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <GraphQLToolsContent />
    </Suspense>
  )
}
