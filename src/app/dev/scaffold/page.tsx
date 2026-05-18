'use client'

import { Button } from '@/components/Button'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Code2,
  Copy,
  FileCode,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface TableInfo {
  name: string
  schema: string
  columns: { name: string; type: string; nullable: boolean }[]
}

interface SchemaData {
  tables: TableInfo[]
}

type TemplateType = 'component' | 'hook' | 'api-route' | 'type'

interface ScaffoldOptions {
  table: string
  template: TemplateType
  typescript: boolean
}

const TEMPLATES: { id: TemplateType; label: string; description: string }[] = [
  { id: 'component', label: 'React Component', description: 'List/detail component with all 7 UI states' },
  { id: 'hook', label: 'Data Hook', description: 'Custom hook for fetch + mutation' },
  { id: 'api-route', label: 'API Route', description: 'Next.js App Router route handler' },
  { id: 'type', label: 'TypeScript Types', description: 'Type definitions from schema' },
]

function generateComponent(table: TableInfo): string {
  const name = table.name.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
  const Name = name.charAt(0).toUpperCase() + name.slice(1)
  return `'use client'

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ${Name}Item {
${table.columns.map((c) => `  ${c.name}${c.nullable ? '?' : ''}: ${c.type === 'integer' || c.type === 'bigint' ? 'number' : c.type === 'boolean' ? 'boolean' : 'string'}`).join('\n')}
}

export function ${Name}List() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<${Name}Item[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/${table.name}')
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = body?.error ?? \`Request failed: \${res.status}\`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else { setError(msg) }
        return
      }
      setData(await res.json())
    } catch { setOffline(true) }
    finally { setLoading(false); setInitialLoad(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (initialLoad && loading) return <ListSkeleton />
  if (offline) return (
    <div className="p-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <WifiOff className="h-5 w-5 text-yellow-500" />
        <p className="text-yellow-400">Cannot reach services</p>
      </div>
      <Button onClick={fetchData} disabled={loading} variant="secondary" size="sm" className="mt-3">
        <RefreshCw className={\`h-4 w-4 mr-2 \${loading ? 'animate-spin' : ''}\`} />Retry
      </Button>
    </div>
  )
  if (error && !data) return (
    <div className="p-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <p className="text-red-400">{error}</p>
      </div>
    </div>
  )
  if (!data) return (
    <div className="p-6 text-center text-gray-400">
      <p>No data loaded.</p>
      <Button onClick={fetchData} disabled={loading} variant="secondary" size="sm" className="mt-3">
        <RefreshCw className="h-4 w-4 mr-2" />Load
      </Button>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">${Name}</h2>
        <Button onClick={fetchData} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={\`h-4 w-4 mr-2 \${loading ? 'animate-spin' : ''}\`} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>
      <div className="rounded-lg border border-white/10 divide-y divide-white/5">
        {data.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No items found.</p>
        ) : data.map((item, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
            <pre className="text-xs text-gray-300 font-mono">{JSON.stringify(item, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
`
}

function generateHook(table: TableInfo): string {
  const name = table.name.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
  const Name = name.charAt(0).toUpperCase() + name.slice(1)
  return `import { useCallback, useEffect, useState } from 'react'

interface ${Name}Item {
${table.columns.map((c) => `  ${c.name}${c.nullable ? '?' : ''}: ${c.type === 'integer' || c.type === 'bigint' ? 'number' : c.type === 'boolean' ? 'boolean' : 'string'}`).join('\n')}
}

interface Use${Name}Result {
  data: ${Name}Item[] | null
  loading: boolean
  error: string | null
  offline: boolean
  refetch: () => Promise<void>
}

export function use${Name}(): Use${Name}Result {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<${Name}Item[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/${table.name}')
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = body?.error ?? \`Request failed: \${res.status}\`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else { setError(msg) }
        return
      }
      setData(await res.json())
    } catch { setOffline(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, offline, refetch }
}
`
}

function generateApiRoute(table: TableInfo): string {
  return `import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    // TODO: fetch from Hasura / Postgres via your data layer
    // Example: query np_${table.name} table
    return NextResponse.json({ items: [], total: 0 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch ${table.name}' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    // TODO: validate + insert into np_${table.name}
    return NextResponse.json({ success: true, data: body })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create ${table.name}' },
      { status: 500 },
    )
  }
}
`
}

function generateTypes(table: TableInfo): string {
  const name = table.name.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
  const Name = name.charAt(0).toUpperCase() + name.slice(1)
  const tsType = (pg: string): string => {
    if (['integer', 'bigint', 'numeric', 'float', 'double precision'].includes(pg)) return 'number'
    if (pg === 'boolean') return 'boolean'
    if (pg.includes('[]')) return `${tsType(pg.replace('[]', ''))}[]`
    if (pg === 'jsonb' || pg === 'json') return 'Record<string, unknown>'
    return 'string'
  }
  return `/** Auto-generated from table: ${table.schema}.${table.name} */

export interface ${Name} {
${table.columns.map((c) => `  ${c.name}${c.nullable ? '?' : ''}: ${tsType(c.type)}`).join('\n')}
}

export type Create${Name} = Omit<${Name}, 'id' | 'created_at' | 'updated_at'>
export type Update${Name} = Partial<Create${Name}>
`
}

function generateCode(opts: ScaffoldOptions, table: TableInfo): string {
  switch (opts.template) {
    case 'component': return generateComponent(table)
    case 'hook': return generateHook(table)
    case 'api-route': return generateApiRoute(table)
    case 'type': return generateTypes(table)
    default: return ''
  }
}

function ScaffoldContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [schema, setSchema] = useState<SchemaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [opts, setOpts] = useState<ScaffoldOptions>({
    table: '',
    template: 'component',
    typescript: true,
  })
  const [generated, setGenerated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showTables, setShowTables] = useState(false)

  const fetchSchema = useCallback(async () => {
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
      const data = await res.json()
      setSchema(data)
      if (data?.tables?.length > 0 && !opts.table) {
        setOpts((prev) => ({ ...prev, table: data.tables[0].name }))
      }
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [opts.table])

  useEffect(() => {
    fetchSchema()
  }, [fetchSchema])

  function handleGenerate() {
    if (!schema || !opts.table) return
    const table = schema.tables.find((t) => t.name === opts.table)
    if (!table) return
    setGenerated(generateCode(opts, table))
    setCopied(false)
  }

  async function handleCopy() {
    if (!generated) return
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <FormSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself services</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Scaffold requires a running Hasura instance to read the schema.
            </p>
          </div>
        </div>
        <Button onClick={fetchSchema} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !schema) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load schema</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchSchema} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!schema) {
    return (
      <div className="p-6 text-center text-gray-400">
        <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No schema available.</p>
        <Button onClick={fetchSchema} disabled={loading} variant="secondary" size="sm" className="mt-3">
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Code Scaffold</h2>
          <p className="text-sm text-gray-400 mt-1">Generate boilerplate from your database schema</p>
        </div>
        <Button onClick={fetchSchema} disabled={loading} variant="secondary" size="sm">
          {/* State 2: refresh spinner */}
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* Options form */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5 space-y-4">
        {/* Table selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Table</label>
          <div className="relative">
            <select
              value={opts.table}
              onChange={(e) => setOpts((prev) => ({ ...prev, table: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/50 transition-colors pr-8"
            >
              {schema.tables.length === 0 ? (
                <option value="">No tables found</option>
              ) : (
                schema.tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.schema}.{t.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
          {schema.tables.length > 0 && (
            <button
              onClick={() => setShowTables((v) => !v)}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              {showTables ? 'Hide' : 'Show'} table columns
            </button>
          )}
          {showTables && opts.table && (
            <div className="mt-2 rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400">Column</th>
                    <th className="px-3 py-2 text-left text-gray-400">Type</th>
                    <th className="px-3 py-2 text-left text-gray-400">Nullable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(schema.tables.find((t) => t.name === opts.table)?.columns ?? []).map((col) => (
                    <tr key={col.name} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 text-white">{col.name}</td>
                      <td className="px-3 py-1.5 text-sky-400">{col.type}</td>
                      <td className="px-3 py-1.5 text-gray-400">{col.nullable ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Template selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Template</label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpts((prev) => ({ ...prev, template: t.id }))}
                className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                  opts.template === t.id
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
                    : 'border-white/10 bg-white/[0.02] text-gray-300 hover:border-white/20'
                }`}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!opts.table || schema.tables.length === 0}
          size="sm"
        >
          <FileCode className="h-4 w-4 mr-2" />
          Generate
        </Button>
      </div>

      {/* Generated output */}
      {generated && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-sky-400" />
              <span className="text-sm text-gray-300 font-mono">
                {opts.template === 'component'
                  ? `${opts.table}-list.tsx`
                  : opts.template === 'hook'
                    ? `use-${opts.table}.ts`
                    : opts.template === 'api-route'
                      ? `route.ts`
                      : `${opts.table}.types.ts`}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs text-gray-300 font-mono whitespace-pre overflow-auto max-h-[32rem] bg-black/20">
            {generated}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ScaffoldContent />
    </Suspense>
  )
}
