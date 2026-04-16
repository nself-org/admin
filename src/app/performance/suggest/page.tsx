'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type { OptimizationSuggestion } from '@/types/performance'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  MemoryStick,
  Network,
  Play,
  RefreshCw,
  Settings,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function SuggestContent() {
  const [loading, setLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
    new Set(),
  )

  const fetchSuggestions = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockSuggestions: OptimizationSuggestion[] = [
        {
          id: '1',
          category: 'database',
          priority: 'high',
          title: 'Add index to users.email column',
          description:
            'The users table is frequently queried by email but lacks an index on this column. Adding an index could improve query performance by 10-100x.',
          impact: 'Query time reduction from ~125ms to ~2ms',
          command: 'nself db migrate:create add_email_index',
          documentationUrl:
            'https://www.postgresql.org/docs/current/indexes.html',
        },
        {
          id: '2',
          category: 'cache',
          priority: 'high',
          title: 'Increase Redis maxmemory',
          description:
            'Redis is approaching its memory limit (85% used). Consider increasing maxmemory to prevent eviction of frequently accessed keys.',
          impact: 'Prevent cache misses and improve response times',
          command: 'nself config set redis.maxmemory 2gb',
        },
        {
          id: '3',
          category: 'memory',
          priority: 'medium',
          title: 'Optimize Hasura memory allocation',
          description:
            'Hasura is using more memory than necessary for the current workload. Reducing the allocation could free resources for other services.',
          impact: 'Free up ~512MB of memory',
          command: 'nself config set hasura.memory 1536m',
        },
        {
          id: '4',
          category: 'network',
          priority: 'medium',
          title: 'Enable HTTP/2 in Nginx',
          description:
            'HTTP/2 is not enabled. Enabling it would improve performance for clients through multiplexing and header compression.',
          impact: 'Reduce page load time by 20-30%',
          command: 'nself config set nginx.http2 true',
        },
        {
          id: '5',
          category: 'database',
          priority: 'medium',
          title: 'Increase PostgreSQL shared_buffers',
          description:
            'Current shared_buffers is set to default. Increasing it to 25% of available RAM would improve cache hit ratio.',
          impact: 'Improve cache hit ratio from 98.5% to 99.5%',
          command: 'nself config set postgres.shared_buffers 4GB',
        },
        {
          id: '6',
          category: 'cpu',
          priority: 'low',
          title: 'Enable query caching in Hasura',
          description:
            'GraphQL query caching is not enabled. This could reduce CPU usage for repeated queries.',
          impact: 'Reduce CPU usage by 10-15%',
          command: 'nself config set hasura.query_cache true',
        },
        {
          id: '7',
          category: 'config',
          priority: 'low',
          title: 'Enable gzip compression',
          description:
            'Response compression is not fully optimized. Enabling gzip for all text-based responses would reduce bandwidth.',
          impact: 'Reduce bandwidth by 60-70%',
          command: 'nself config set nginx.gzip on',
        },
      ]
      setSuggestions(mockSuggestions)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      await fetch('/api/performance/analyze', { method: 'POST' })
      await fetchSuggestions()
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applySuggestion = async (suggestion: OptimizationSuggestion) => {
    if (!suggestion.command) return

    try {
      await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: suggestion.command }),
      })
      setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]))
    } catch (_error) {
      // Handle error
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database':
        return Database
      case 'cache':
        return Zap
      case 'memory':
        return MemoryStick
      case 'cpu':
        return Cpu
      case 'network':
        return Network
      case 'config':
        return Settings
      default:
        return HardDrive
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'database':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
      case 'cache':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'memory':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'cpu':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'network':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'config':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  const filteredSuggestions = suggestions.filter((s) => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false
    if (filterPriority !== 'all' && s.priority !== filterPriority) return false
    return true
  })

  const stats = {
    total: suggestions.length,
    high: suggestions.filter((s) => s.priority === 'high').length,
    medium: suggestions.filter((s) => s.priority === 'medium').length,
    low: suggestions.filter((s) => s.priority === 'low').length,
    applied: appliedSuggestions.size,
  }

  if (loading) {
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
              <h1 className="bg-gradient-to-r from-yellow-600 to-orange-400 bg-clip-text text-4xl font-bold text-transparent dark:from-yellow-400 dark:to-orange-300">
                Optimization Suggestions
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                AI-powered recommendations to improve system performance
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Run Analysis
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Total Suggestions
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              High Priority
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.high}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Medium Priority
            </p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.medium}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Low Priority
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.low}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Applied</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.applied}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="database">Database</option>
            <option value="cache">Cache</option>
            <option value="memory">Memory</option>
            <option value="cpu">CPU</option>
            <option value="network">Network</option>
            <option value="config">Config</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Suggestions List */}
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => {
            const CategoryIcon = getCategoryIcon(suggestion.category)
            const isApplied = appliedSuggestions.has(suggestion.id)

            return (
              <div
                key={suggestion.id}
                className={`rounded-xl border bg-white p-6 shadow-sm transition-all dark:bg-zinc-800 ${
                  isApplied
                    ? 'border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-900/10'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${getCategoryColor(suggestion.category)}`}
                    >
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">
                          {suggestion.title}
                        </h3>
                        {isApplied && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getCategoryColor(suggestion.category)}`}
                        >
                          {suggestion.category}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getPriorityColor(suggestion.priority)}`}
                        >
                          {suggestion.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isApplied && suggestion.command && (
                    <button
                      onClick={() => applySuggestion(suggestion)}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      <Play className="h-4 w-4" />
                      Apply
                    </button>
                  )}
                </div>

                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  {suggestion.description}
                </p>

                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
                  <AlertTriangle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Expected Impact: {suggestion.impact}
                  </p>
                </div>

                {suggestion.command && (
                  <div className="mt-4 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
                    <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Command
                    </p>
                    <code className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                      {suggestion.command}
                    </code>
                  </div>
                )}

                {suggestion.documentationUrl && (
                  <a
                    href={suggestion.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Learn more
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No Suggestions
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {filterCategory !== 'all' || filterPriority !== 'all'
                ? 'No suggestions match your current filters.'
                : 'Your system is well optimized! Run analysis to check for new recommendations.'}
            </p>
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">nself perf suggest</span> - Get
              optimization suggestions
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">
                nself perf suggest --apply
              </span>{' '}
              - Auto-apply safe suggestions
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">
                nself perf suggest --category=database
              </span>{' '}
              - Filter by category
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <SuggestContent />
    </Suspense>
  )
}
