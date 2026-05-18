'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Database,
  RefreshCw,
  Search,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SlowQuery {
  id: string
  query: string
  avgTime: number
  maxTime: number
  calls: number
  totalTime: number
  rows: number
  shared_blks_hit: number
  shared_blks_read: number
}

function QueriesContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'avgTime' | 'calls' | 'totalTime'>(
    'totalTime',
  )
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    queries: SlowQuery[]
  }>('/api/performance/queries', fetcher)

  const queries = data?.queries ?? []

  const filteredQueries = queries
    .filter((q) => q.query.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy])

  const totalStats = {
    queries: queries.length,
    totalCalls: queries.reduce((acc, q) => acc + q.calls, 0),
    totalTime: queries.reduce((acc, q) => acc + q.totalTime, 0),
    avgTime:
      queries.reduce((acc, q) => acc + q.avgTime, 0) / queries.length || 0,
  }

  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load slow queries'}
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <Link
            href="/performance"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Performance
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-cyan-300">
                Slow Query Analysis
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Identify and optimize slow database queries
              </p>
            </div>
            <button
              onClick={() => mutate()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Slow Queries
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {totalStats.queries}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <TrendingUp className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Calls
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {totalStats.totalCalls.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Time
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {(totalStats.totalTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg Time
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {totalStats.avgTime.toFixed(1)}ms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search queries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'avgTime' | 'calls' | 'totalTime')
            }
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="totalTime">Sort by Total Time</option>
            <option value="avgTime">Sort by Avg Time</option>
            <option value="calls">Sort by Calls</option>
          </select>
        </div>

        {/* Query List */}
        <div className="space-y-4">
          {filteredQueries.map((query) => (
            <div
              key={query.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="mb-3 flex items-start justify-between">
                <pre className="flex-1 overflow-x-auto rounded-lg bg-zinc-100 p-3 font-mono text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {query.query}
                </pre>
                <button
                  onClick={() =>
                    setSelectedQuery(
                      selectedQuery?.id === query.id ? null : query,
                    )
                  }
                  className="ml-4 text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {selectedQuery?.id === query.id ? 'Hide' : 'Details'}
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-5">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Avg Time
                  </p>
                  <p
                    className={`font-medium ${
                      query.avgTime > 100
                        ? 'text-red-600 dark:text-red-400'
                        : query.avgTime > 50
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {query.avgTime.toFixed(1)}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Max Time
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {query.maxTime.toFixed(1)}ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Calls
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {query.calls.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Total Time
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {(query.totalTime / 1000).toFixed(1)}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Rows
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {query.rows.toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedQuery?.id === query.id && (
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">
                    Buffer Statistics
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Shared Blocks Hit
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {query.shared_blks_hit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Shared Blocks Read
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {query.shared_blks_read.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Hit Ratio
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {(
                          (query.shared_blks_hit /
                            (query.shared_blks_hit + query.shared_blks_read)) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h5 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Optimization Suggestions
                    </h5>
                    <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {query.avgTime > 100 && (
                        <li>
                          Consider adding an index on frequently filtered
                          columns
                        </li>
                      )}
                      {query.shared_blks_read > query.shared_blks_hit * 0.1 && (
                        <li>
                          High disk reads - consider increasing shared_buffers
                        </li>
                      )}
                      {query.query.includes('SELECT *') && (
                        <li>Avoid SELECT * - specify only needed columns</li>
                      )}
                      {query.query.includes('LIKE') && (
                        <li>LIKE queries may benefit from a trigram index</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself perf queries</span> - List
              slow queries
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">
                nself perf queries --explain
              </span>{' '}
              - Show query plans
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself perf queries --reset</span>{' '}
              - Reset query statistics
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function QueriesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <QueriesContent />
    </Suspense>
  )
}
