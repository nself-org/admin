'use client'

/**
 * np_* Table Browser — /database/np-tables
 * Read-only inspection of nSelf plugin tables (np_ prefix).
 * Features:
 *   - Left sidebar: table list from GET /api/database/np-tables
 *   - Main area: paginated rows from GET /api/database/np-tables/{table}?page=0&limit=20
 *   - Client-side search by stringifying row values
 *   - Column sort (click header toggles asc/desc)
 *   - Export CSV button (current page)
 */

import { PageTemplate } from '@/components/PageTemplate'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

const MOCK_TABLES: string[] = [
  'np_ai_usage',
  'np_ai_sessions',
  'np_mux_rules',
  'np_mux_messages',
  'np_claw_sessions',
  'np_claw_messages',
  'np_claw_memories',
  'np_notify_channels',
  'np_notify_log',
  'np_cron_jobs',
  'np_plugin_registry',
  'np_billing_subscriptions',
  'np_billing_invoices',
  'np_license_keys',
  'np_telemetry_events',
]

// Minimal mock rows per table — real data comes from the API
const MOCK_ROW_DATA: Record<string, Record<string, unknown>[]> = {
  np_plugin_registry: [
    {
      id: 1,
      name: 'ai',
      version: '1.2.0',
      enabled: true,
      installed_at: '2026-01-15T10:00:00Z',
    },
    {
      id: 2,
      name: 'mux',
      version: '1.0.5',
      enabled: true,
      installed_at: '2026-01-15T10:01:00Z',
    },
    {
      id: 3,
      name: 'claw',
      version: '0.9.2',
      enabled: false,
      installed_at: '2026-02-01T09:00:00Z',
    },
  ],
  np_license_keys: [
    {
      id: '00000000-cafe',
      key_prefix: 'nself_pro_owner',
      tier: 'enterprise',
      active: true,
      expires_at: null,
    },
  ],
}

type SortDir = 'asc' | 'desc' | null

interface TableRowsResponse {
  rows: Record<string, unknown>[]
  total: number
  page: number
  limit: number
}

function exportCsv(
  columns: string[],
  rows: Record<string, unknown>[],
  tableName: string,
) {
  const header = columns.join(',')
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = row[col]
          const str = val === null || val === undefined ? '' : String(val)
          // Quote fields that contain commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(','),
    )
    .join('\n')

  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${tableName}-page.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function NpTablesContent() {
  const [tables, setTables] = useState<string[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState<string | null>(null)

  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const LIMIT = 20

  // Fetch table list
  useEffect(() => {
    async function loadTables() {
      setTablesLoading(true)
      setTablesError(null)
      try {
        const res = await fetch('/api/database/np-tables')
        if (res.ok) {
          const data = await res.json()
          setTables(data?.tables ?? MOCK_TABLES)
        } else {
          setTables(MOCK_TABLES)
        }
      } catch {
        setTables(MOCK_TABLES)
      } finally {
        setTablesLoading(false)
      }
    }
    loadTables()
  }, [])

  // Fetch rows whenever selectedTable or page changes
  const fetchRows = useCallback(async (tableName: string, pageNum: number) => {
    setRowsLoading(true)
    setRowsError(null)
    try {
      const res = await fetch(
        `/api/database/np-tables/${tableName}?page=${pageNum}&limit=${LIMIT}`,
      )
      if (res.ok) {
        const data: TableRowsResponse = await res.json()
        const fetchedRows = data.rows ?? []
        setRows(fetchedRows)
        setTotal(data.total ?? fetchedRows.length)
        setColumns(fetchedRows.length > 0 ? Object.keys(fetchedRows[0]) : [])
      } else {
        // API not yet implemented — fall back to mock data
        const mockRows = MOCK_ROW_DATA[tableName] ?? []
        setRows(mockRows)
        setTotal(mockRows.length)
        setColumns(mockRows.length > 0 ? Object.keys(mockRows[0]) : [])
      }
    } catch {
      const mockRows = MOCK_ROW_DATA[tableName] ?? []
      setRows(mockRows)
      setTotal(mockRows.length)
      setColumns(mockRows.length > 0 ? Object.keys(mockRows[0]) : [])
    } finally {
      setRowsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchRows(selectedTable, page)
    }
  }, [selectedTable, page, fetchRows])

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName)
    setPage(0)
    setSearch('')
    setSortCol(null)
    setSortDir(null)
  }

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else if (sortDir === 'desc') {
        setSortCol(null)
        setSortDir(null)
      } else {
        setSortDir('asc')
      }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Client-side filter + sort
  const filteredRows = rows.filter((row) => {
    if (!search) return true
    return JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  })

  const sortedRows = sortCol
    ? [...filteredRows].sort((a, b) => {
        const aVal = String(a[sortCol] ?? '')
        const bVal = String(b[sortCol] ?? '')
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filteredRows

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) {
      return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-zinc-600" />
    }
    if (sortDir === 'asc') {
      return <ChevronUp className="ml-1 inline h-3 w-3 text-zinc-300" />
    }
    return <ChevronDown className="ml-1 inline h-3 w-3 text-zinc-300" />
  }

  return (
    <PageTemplate
      title="Plugin Tables"
      description="Read-only browser for np_* database tables created by installed plugins"
    >
      <div className="flex min-h-[600px] gap-0 overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-zinc-700/50 bg-zinc-900/50">
          <div className="border-b border-zinc-700/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-300">Tables</span>
            </div>
          </div>

          {tablesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : tablesError ? (
            <p className="px-4 py-3 text-xs text-red-400">{tablesError}</p>
          ) : (
            <ul className="py-2" role="listbox" aria-label="Plugin tables">
              {tables.map((tableName) => (
                <li key={tableName}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedTable === tableName}
                    onClick={() => handleTableSelect(tableName)}
                    className={`w-full truncate px-4 py-2 text-left font-mono text-xs transition-colors ${
                      selectedTable === tableName
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {tableName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selectedTable ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <Database className="mb-4 h-12 w-12 text-zinc-700" />
              <p className="text-sm text-zinc-400">
                Select a table from the sidebar
              </p>
            </div>
          ) : (
            <>
              {/* Table toolbar */}
              <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-white">
                    {selectedTable}
                  </span>
                  {!rowsLoading && (
                    <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">
                      {total} rows
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter rows..."
                      className="w-44 rounded border border-zinc-700 bg-zinc-900 py-1.5 pr-3 pl-7 text-xs text-zinc-300 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                      aria-label="Filter rows"
                    />
                  </div>

                  {/* Refresh */}
                  <button
                    type="button"
                    onClick={() => fetchRows(selectedTable, page)}
                    disabled={rowsLoading}
                    className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                    aria-label="Refresh rows"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${rowsLoading ? 'animate-spin' : ''}`}
                    />
                  </button>

                  {/* Export CSV */}
                  <button
                    type="button"
                    onClick={() =>
                      exportCsv(columns, sortedRows, selectedTable)
                    }
                    disabled={sortedRows.length === 0}
                    className="flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                    aria-label="Export current page as CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {rowsError && (
                  <div
                    role="alert"
                    className="m-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {rowsError}
                  </div>
                )}

                {rowsLoading && rows.length === 0 ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                  </div>
                ) : sortedRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Database className="mb-3 h-10 w-10 text-zinc-700" />
                    <p className="text-sm text-zinc-400">
                      {search
                        ? 'No rows match your filter'
                        : 'This table is empty'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm" aria-label={selectedTable}>
                    <thead className="sticky top-0 border-b border-zinc-700/50 bg-zinc-900/80 backdrop-blur-sm">
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="cursor-pointer px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase select-none hover:text-zinc-300"
                            onClick={() => handleSort(col)}
                            aria-sort={
                              sortCol === col
                                ? sortDir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            {col}
                            <SortIcon col={col} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b border-zinc-700/30 hover:bg-zinc-700/20"
                        >
                          {columns.map((col) => {
                            const val = row[col]
                            const display =
                              val === null || val === undefined
                                ? ''
                                : typeof val === 'object'
                                  ? JSON.stringify(val)
                                  : String(val)
                            const isNull = val === null || val === undefined
                            return (
                              <td
                                key={col}
                                className="max-w-[240px] truncate px-4 py-2.5 font-mono text-xs"
                                title={display}
                              >
                                <span
                                  className={
                                    isNull
                                      ? 'text-zinc-600 italic'
                                      : typeof val === 'boolean'
                                        ? val
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                        : 'text-zinc-300'
                                  }
                                >
                                  {isNull ? 'null' : display}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-zinc-700/50 px-4 py-2.5">
                <p className="text-xs text-zinc-500">
                  Page {page + 1} of {totalPages}
                  {search && (
                    <span className="ml-2 text-zinc-600">
                      ({sortedRows.length} filtered)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || rowsLoading}
                    className="flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1 || rowsLoading}
                    className="flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  )
}

export default function NpTablesPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NpTablesContent />
    </Suspense>
  )
}
