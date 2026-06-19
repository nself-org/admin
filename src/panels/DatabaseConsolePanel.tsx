/**
 * DatabaseConsolePanel — admin SQL console with 7-state AsyncScreen.
 *
 * Purpose: Let admins run arbitrary SQL queries against the nSelf Postgres
 *   database. Zod validates non-empty input only (admin has full SQL access).
 * Inputs: user SQL input, /api/database/query endpoint
 * Outputs: results table or error card; skeleton while loading
 * Constraints:
 *   - Zod validates non-empty only — no query-type restriction (admin)
 *   - Offline state = stack not running
 *   - Empty state = no rows returned (query succeeded but 0 results)
 *   - Error state = SQL execution failure
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: DatabaseConsolePanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { useStackStatus } from '@/hooks/useStackStatus'
import { err, ok, sqlError, toAdminError, type Result } from '@/lib/result'
import { sqlInputSchema } from '@/lib/validation/admin-forms'
import { Play } from 'lucide-react'
import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  executionTime?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DatabaseConsolePanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [query, setQuery] = useState('')
  const [queryError, setQueryError] = useState<string | null>(null)
  const [result, setResult] = useState<Result<QueryResult> | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  const runQuery = useCallback(async () => {
    // Zod validation: non-empty only
    const parsed = sqlInputSchema.safeParse({ query })
    if (!parsed.success) {
      setQueryError(parsed.error.issues[0]?.message ?? 'Invalid input.')
      return
    }
    setQueryError(null)
    setLoading(true)
    setHasRun(true)
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: parsed.data.query }),
      })
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setResult(err(sqlError(data?.error ?? `HTTP ${res.status}`)))
        return
      }
      const data: QueryResult = await res.json()
      setResult(ok(data))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [query])

  // ---------------------------------------------------------------------------
  // Derive state for results pane
  // ---------------------------------------------------------------------------

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!hasRun) return 'empty'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    if (result.value.rows.length === 0) return 'empty'
    return 'ready'
  })()

  const qr = result?.ok ? result.value : null

  return (
    <section aria-label="Database Console" className="space-y-4">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
          }}
        />
      )}

      {/* SQL input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={6}
          placeholder="SELECT * FROM np_users LIMIT 20;"
          disabled={stackIsDown}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
        />
        {queryError && <p className="text-sm text-red-600 dark:text-red-400">{queryError}</p>}
        <button
          onClick={runQuery}
          disabled={stackIsDown || loading}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Play className="h-4 w-4" />
          Run
        </button>
      </div>

      {/* Results pane */}
      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={runQuery}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage={hasRun ? 'Query returned 0 rows.' : 'Enter SQL above and click Run.'}
      >
        {qr && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {qr.rowCount} row{qr.rowCount !== 1 ? 's' : ''}
              {qr.executionTime !== undefined && ` — ${qr.executionTime}ms`}
            </p>
            <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  {qr.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {qr.rows.map((row, idx) => (
                  <tr key={idx}>
                    {qr.columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        {row[col] === null ? (
                          <span className="text-zinc-400 italic">null</span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncScreen>
    </section>
  )
}
