'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type { BenchmarkBaseline } from '@/types/performance'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Download,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function BaselineContent() {
  const [loading, setLoading] = useState(true)
  const [baselines, setBaselines] = useState<BenchmarkBaseline[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBaselineName, setNewBaselineName] = useState('')
  const [selectedBaseline, setSelectedBaseline] = useState<string | null>(null)

  const fetchBaselines = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockBaselines: BenchmarkBaseline[] = [
        {
          id: 'baseline-1',
          name: 'Production v1.2.0',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          results: [
            {
              id: '1',
              target: 'API - GraphQL',
              type: 'api',
              timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
              duration: 60000,
              requests: {
                total: 15000,
                successful: 14985,
                failed: 15,
                perSecond: 250,
              },
              latency: {
                min: 5,
                max: 450,
                avg: 45,
                p50: 38,
                p95: 120,
                p99: 250,
              },
              throughput: { bytesPerSecond: 2500000, requestsPerSecond: 250 },
            },
          ],
        },
        {
          id: 'baseline-2',
          name: 'Pre-optimization',
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          results: [
            {
              id: '2',
              target: 'API - GraphQL',
              type: 'api',
              timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
              duration: 60000,
              requests: {
                total: 12000,
                successful: 11900,
                failed: 100,
                perSecond: 200,
              },
              latency: {
                min: 10,
                max: 650,
                avg: 75,
                p50: 60,
                p95: 180,
                p99: 400,
              },
              throughput: { bytesPerSecond: 2000000, requestsPerSecond: 200 },
            },
          ],
        },
        {
          id: 'baseline-3',
          name: 'Staging Environment',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          results: [
            {
              id: '3',
              target: 'Database - PostgreSQL',
              type: 'database',
              timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
              duration: 30000,
              requests: {
                total: 50000,
                successful: 49998,
                failed: 2,
                perSecond: 1666,
              },
              latency: {
                min: 0.5,
                max: 85,
                avg: 2.5,
                p50: 1.8,
                p95: 8,
                p99: 25,
              },
              throughput: { bytesPerSecond: 5000000, requestsPerSecond: 1666 },
            },
          ],
        },
      ]
      setBaselines(mockBaselines)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBaselines()
  }, [fetchBaselines])

  const createBaseline = async () => {
    if (!newBaselineName.trim()) return

    const newBaseline: BenchmarkBaseline = {
      id: Date.now().toString(),
      name: newBaselineName,
      createdAt: new Date().toISOString(),
      results: [],
    }

    setBaselines([newBaseline, ...baselines])
    setNewBaselineName('')
    setShowCreateForm(false)
  }

  const deleteBaseline = async (id: string) => {
    setBaselines(baselines.filter((b) => b.id !== id))
  }

  const filteredBaselines = baselines.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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
            href="/benchmark"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Benchmarks
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-cyan-300">
                Baseline Management
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Save and manage benchmark baselines for comparison
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Baseline
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search baselines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Create New Baseline
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newBaselineName}
                onChange={(e) => setNewBaselineName(e.target.value)}
                placeholder="Baseline name (e.g., Production v1.3.0)"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <button
                onClick={createBaseline}
                disabled={!newBaselineName.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Baselines List */}
        {filteredBaselines.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <Save className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No Baselines Found
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              {searchQuery
                ? 'No baselines match your search.'
                : 'Create your first baseline to start tracking performance over time.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create First Baseline
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBaselines.map((baseline) => (
              <div
                key={baseline.id}
                className={`rounded-xl border bg-white p-6 shadow-sm transition-all dark:bg-zinc-800 ${
                  selectedBaseline === baseline.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {baseline.name}
                      </h3>
                      {selectedBaseline === baseline.id && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mb-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(baseline.createdAt).toLocaleDateString()}
                      </span>
                      <span>{baseline.results.length} benchmark results</span>
                    </div>

                    {/* Results Summary */}
                    {baseline.results.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-3">
                        {baseline.results.slice(0, 3).map((result) => (
                          <div
                            key={result.id}
                            className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
                          >
                            <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {result.target}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-zinc-500">Avg:</span>{' '}
                                <span className="text-zinc-900 dark:text-white">
                                  {result.latency.avg.toFixed(1)}ms
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">P95:</span>{' '}
                                <span className="text-zinc-900 dark:text-white">
                                  {result.latency.p95.toFixed(1)}ms
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">RPS:</span>{' '}
                                <span className="text-zinc-900 dark:text-white">
                                  {result.throughput.requestsPerSecond}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">Success:</span>{' '}
                                <span className="text-zinc-900 dark:text-white">
                                  {(
                                    (result.requests.successful /
                                      result.requests.total) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSelectedBaseline(
                          selectedBaseline === baseline.id ? null : baseline.id,
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        selectedBaseline === baseline.id
                          ? 'bg-blue-600 text-white'
                          : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {selectedBaseline === baseline.id ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        'Select'
                      )}
                    </button>
                    <button className="rounded-lg border border-zinc-300 p-2 text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteBaseline(baseline.id)}
                      className="rounded-lg border border-red-300 p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compare Button */}
        {selectedBaseline && (
          <div className="mt-8 flex justify-center">
            <Link
              href={`/benchmark/compare?baseline=${selectedBaseline}`}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Compare with Current Results
            </Link>
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself bench --save=name</span> -
              Save results as baseline
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself bench baselines</span> -
              List all baselines
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">
                nself bench baselines --delete=name
              </span>{' '}
              - Delete baseline
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">
                nself bench baselines --export=name
              </span>{' '}
              - Export baseline
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function BaselinePage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BaselineContent />
    </Suspense>
  )
}
