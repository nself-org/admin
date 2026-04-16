'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface Span {
  id: string
  name: string
  service: string
  duration: number
  startTime: number
  status: 'ok' | 'error'
  children?: Span[]
}

interface Trace {
  id: string
  name: string
  service: string
  duration: number
  timestamp: string
  status: 'ok' | 'error'
  spanCount: number
  spans: Span[]
}

function TracesContent() {
  const [loading, setLoading] = useState(true)
  const [traces, setTraces] = useState<Trace[]>([])
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null)
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterService, setFilterService] = useState('all')

  const fetchTraces = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockTraces: Trace[] = [
        {
          id: 'trace-1',
          name: 'POST /api/graphql',
          service: 'hasura',
          duration: 125,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          status: 'ok',
          spanCount: 5,
          spans: [
            {
              id: 'span-1',
              name: 'HTTP POST /api/graphql',
              service: 'nginx',
              duration: 125,
              startTime: 0,
              status: 'ok',
              children: [
                {
                  id: 'span-2',
                  name: 'graphql.execute',
                  service: 'hasura',
                  duration: 100,
                  startTime: 5,
                  status: 'ok',
                  children: [
                    {
                      id: 'span-3',
                      name: 'db.query',
                      service: 'postgres',
                      duration: 45,
                      startTime: 15,
                      status: 'ok',
                    },
                    {
                      id: 'span-4',
                      name: 'db.query',
                      service: 'postgres',
                      duration: 30,
                      startTime: 65,
                      status: 'ok',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'trace-2',
          name: 'POST /api/auth/login',
          service: 'auth',
          duration: 85,
          timestamp: new Date(Date.now() - 120000).toISOString(),
          status: 'ok',
          spanCount: 4,
          spans: [],
        },
        {
          id: 'trace-3',
          name: 'GET /api/users',
          service: 'hasura',
          duration: 350,
          timestamp: new Date(Date.now() - 180000).toISOString(),
          status: 'error',
          spanCount: 3,
          spans: [],
        },
      ]
      setTraces(mockTraces)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTraces()
  }, [fetchTraces])

  const toggleSpan = (spanId: string) => {
    const newExpanded = new Set(expandedSpans)
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId)
    } else {
      newExpanded.add(spanId)
    }
    setExpandedSpans(newExpanded)
  }

  const renderSpan = (span: Span, depth: number = 0, totalDuration: number) => {
    const hasChildren = span.children && span.children.length > 0
    const isExpanded = expandedSpans.has(span.id)
    const widthPercent = (span.duration / totalDuration) * 100
    const leftPercent = (span.startTime / totalDuration) * 100

    return (
      <div
        key={span.id}
        className="border-l-2 border-zinc-200 dark:border-zinc-700"
      >
        <div
          className={`flex items-center gap-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${
            depth > 0 ? 'ml-4' : ''
          }`}
        >
          {hasChildren ? (
            <button onClick={() => toggleSpan(span.id)} className="p-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-white">
                {span.name}
              </span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                {span.service}
              </span>
              {span.status === 'error' && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Error
                </span>
              )}
            </div>
            <div className="relative h-4 rounded bg-zinc-100 dark:bg-zinc-700">
              <div
                className={`absolute h-4 rounded ${
                  span.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 1)}%`,
                }}
              />
            </div>
          </div>
          <span className="text-sm text-zinc-500">{span.duration}ms</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {span.children!.map((child) =>
              renderSpan(child, depth + 1, totalDuration),
            )}
          </div>
        )}
      </div>
    )
  }

  const filteredTraces = traces.filter((t) => {
    if (filterService !== 'all' && t.service !== filterService) return false
    if (
      searchQuery &&
      !t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    return true
  })

  const services = [...new Set(traces.map((t) => t.service))]

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
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
            href="/monitor"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Monitor
          </Link>
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
            Distributed Tracing
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Trace requests across services
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search traces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 text-zinc-900 focus:border-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="all">All Services</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Traces List */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              <GitBranch className="h-5 w-5" />
              Recent Traces
            </h3>
            <div className="space-y-3">
              {filteredTraces.map((trace) => (
                <button
                  key={trace.id}
                  onClick={() => setSelectedTrace(trace)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedTrace?.id === trace.id
                      ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-900/20'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {trace.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        trace.status === 'ok'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {trace.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>{trace.service}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {trace.duration}ms
                    </span>
                    <span>{trace.spanCount} spans</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(trace.timestamp).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Trace Detail */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Trace Detail
            </h3>
            {selectedTrace ? (
              <div>
                <div className="mb-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {selectedTrace.name}
                    </span>
                    <span className="text-sm text-zinc-500">
                      Total: {selectedTrace.duration}ms
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>Service: {selectedTrace.service}</span>
                    <span>{selectedTrace.spanCount} spans</span>
                  </div>
                </div>

                <div className="space-y-1">
                  {selectedTrace.spans.map((span) =>
                    renderSpan(span, 0, selectedTrace.duration),
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-zinc-500">
                Select a trace to view details
              </div>
            )}
          </div>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself traces</span> - List
              recent traces
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself traces --id=trace-id
              </span>{' '}
              - View trace details
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself traces --service=hasura
              </span>{' '}
              - Filter by service
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function TracesPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <TracesContent />
    </Suspense>
  )
}
