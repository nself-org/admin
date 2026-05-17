'use client'

import { Button } from '@/components/Button'
import { TableSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCode,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

interface Column {
  name: string
  type: string
  nullable: boolean
  isPrimary?: boolean
  isUnique?: boolean
}

interface TableDef {
  name: string
  schema: string
  columns: Column[]
}

interface TablesData {
  tables: TableDef[]
}

function pgToTs(pgType: string): string {
  if (['integer', 'bigint', 'smallint', 'serial', 'bigserial', 'numeric', 'float', 'double precision', 'real'].includes(pgType)) return 'number'
  if (pgType === 'boolean') return 'boolean'
  if (pgType.endsWith('[]')) return `${pgToTs(pgType.slice(0, -2))}[]`
  if (pgType === 'jsonb' || pgType === 'json') return 'Record<string, unknown>'
  if (pgType === 'uuid') return 'string /* uuid */'
  if (pgType === 'timestamp' || pgType === 'timestamptz' || pgType.startsWith('timestamp')) return 'string /* ISO 8601 */'
  if (pgType === 'date') return 'string /* YYYY-MM-DD */'
  if (pgType === 'time' || pgType === 'timetz') return 'string /* HH:MM:SS */'
  return 'string'
}

function generateTableTypes(table: TableDef): string {
  const n = table.name.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
  const Name = n.charAt(0).toUpperCase() + n.slice(1)
  const cols = table.columns
    .map((c) => `  /** ${c.type}${c.isPrimary ? ' PRIMARY KEY' : ''}${c.isUnique ? ' UNIQUE' : ''} */\n  ${c.name}${c.nullable ? '?' : ''}: ${pgToTs(c.type)}`)
    .join('\n')
  return (
    `/** ${table.schema}.${table.name} */\nexport interface ${Name} {\n${cols}\n}\n\n` +
    `export type Create${Name} = Omit<${Name}, 'id' | 'created_at' | 'updated_at'>\n` +
    `export type Update${Name} = Partial<Create${Name}>\n` +
    `export type ${Name}Row = ${Name} & { readonly __table: '${table.name}' }`
  )
}

function TypesContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<TablesData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/graphql/hasura?action=tables')
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
      setData(await res.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const filtered = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.tables
    const q = search.toLowerCase()
    return data.tables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.schema.toLowerCase().includes(q),
    )
  }, [data, search])

  async function copyType(table: TableDef) {
    const code = generateTableTypes(table)
    await navigator.clipboard.writeText(code)
    setCopied(table.name)
    setTimeout(() => setCopied(null), 2000)
  }

  async function copyAll() {
    if (!data) return
    const code = data.tables.map((t) => generateTableTypes(t)).join('\n\n')
    await navigator.clipboard.writeText(code)
    setCopied('__all__')
    setTimeout(() => setCopied(null), 2000)
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <TableSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach Hasura</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Type generation requires a running nself stack with Hasura.
            </p>
          </div>
        </div>
        <Button onClick={fetchTables} disabled={loading} variant="secondary" size="sm">
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
            <p className="font-medium text-red-400">Failed to load schema</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchTables} disabled={loading} variant="secondary" size="sm">
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
        <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No schema available.</p>
        <Button onClick={fetchTables} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Schema
        </Button>
      </div>
    )
  }

  // States 6+7: success
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">TypeScript Types</h2>
          <p className="text-sm text-gray-400 mt-1">
            {data.tables.length} table{data.tables.length !== 1 ? 's' : ''} · generated from schema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
          >
            {copied === '__all__' ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Copied all</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy all
              </>
            )}
          </button>
          <Button onClick={fetchTables} disabled={loading} variant="secondary" size="sm">
            {/* State 2: refresh spinner */}
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Search */}
      {data.tables.length > 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
      )}

      {/* Tables list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <FileCode className="h-8 w-8 mx-auto mb-2 opacity-30 text-gray-400" />
          {search ? (
            <>
              <p className="text-gray-400">No tables match &ldquo;{search}&rdquo;</p>
              <button
                onClick={() => setSearch('')}
                className="text-xs text-sky-400 hover:text-sky-300 mt-2 transition-colors"
              >
                Clear search
              </button>
            </>
          ) : (
            <p className="text-gray-400">No tables found in schema.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((table) => {
            const isExpanded = expanded[table.name]
            const generated = generateTableTypes(table)
            return (
              <div key={table.name} className="rounded-lg border border-white/10 overflow-hidden">
                {/* Table row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [table.name]: !prev[table.name] }))
                  }
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <FileCode className="h-4 w-4 text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-mono text-white">{table.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{table.schema}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {table.columns.length} col{table.columns.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyType(table)
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                    >
                      {copied === table.name ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span className="text-green-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </button>

                {/* Expanded: column table + generated types */}
                {isExpanded && (
                  <div className="border-t border-white/10">
                    {/* Columns */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-400">Column</th>
                            <th className="px-4 py-2 text-left text-gray-400">PG Type</th>
                            <th className="px-4 py-2 text-left text-gray-400">TS Type</th>
                            <th className="px-4 py-2 text-left text-gray-400">Nullable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {table.columns.map((col) => (
                            <tr key={col.name} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-1.5 text-white">
                                {col.name}
                                {col.isPrimary && (
                                  <span className="ml-1 text-[10px] text-yellow-400">PK</span>
                                )}
                              </td>
                              <td className="px-4 py-1.5 text-gray-400">{col.type}</td>
                              <td className="px-4 py-1.5 text-sky-400">{pgToTs(col.type)}</td>
                              <td className="px-4 py-1.5 text-gray-500">{col.nullable ? 'yes' : 'no'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Generated code */}
                    <div className="border-t border-white/10">
                      <div className="flex items-center justify-between px-4 py-2 bg-black/20">
                        <span className="text-xs text-gray-500 font-mono">Generated TypeScript</span>
                      </div>
                      <pre className="px-4 py-3 text-xs text-gray-300 font-mono whitespace-pre overflow-auto max-h-64 bg-black/30">
                        {generated}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <TypesContent />
    </Suspense>
  )
}
