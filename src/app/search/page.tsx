'use client'

import { Button } from '@/components/Button'
import { Activity, Calendar, Download, Filter, Search as SearchIcon, Type, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type SearchResult = {
  id: string
  type: 'log' | 'audit' | 'config' | 'service' | 'database' | 'navigation' | 'file'
  title: string
  description: string
  content?: string
  url?: string
  timestamp?: string
  service?: string
  level?: 'error' | 'warn' | 'info' | 'debug'
  score: number
  highlights?: string[]
  metadata?: Record<string, unknown>
}

interface SearchFilters {
  types: string[]
  services: string[]
  levels: string[]
  dateFrom: string
  dateTo: string
  regex: boolean
  caseSensitive: boolean
}

const RESULT_TYPE_LABELS: Record<string, string> = {
  log: 'Log',
  audit: 'Audit',
  config: 'Config',
  service: 'Service',
  database: 'Database',
  navigation: 'Navigation',
  file: 'File',
}

const LEVEL_COLORS: Record<string, string> = {
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  debug: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [took, setTook] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    services: [],
    levels: [],
    dateFrom: '',
    dateTo: '',
    regex: false,
    caseSensitive: false,
  })

  const [availableFilters, setAvailableFilters] = useState<{
    services: string[]
    types: string[]
    levels: string[]
  }>({
    services: [],
    types: [],
    levels: [],
  })

  // Load available filters on mount
  useEffect(() => {
    fetch('/api/search?action=filters')
      .then((res) => res.json())
      .then((data) => {
        if (data.filters) {
          setAvailableFilters(data.filters)
        }
      })
      .catch(() => {
        // Ignore errors
      })
  }, [])

  // Perform search
  const performSearch = useCallback(async () => {
    if (!query || query.trim().length === 0) {
      setResults([])
      return
    }

    setLoading(true)

    try {
      const params = new URLSearchParams({ q: query })

      if (filters.types.length > 0) params.set('types', filters.types.join(','))
      if (filters.services.length > 0) params.set('services', filters.services.join(','))
      if (filters.levels.length > 0) params.set('levels', filters.levels.join(','))
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.regex) params.set('regex', 'true')
      if (filters.caseSensitive) params.set('caseSensitive', 'true')

      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.results || [])
        setTotal(data.total || 0)
        setTook(data.took || 0)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [query, filters])

  // Auto-search on query/filter change
  useEffect(() => {
    const timeout = setTimeout(performSearch, 300)
    return () => clearTimeout(timeout)
  }, [performSearch])

  const toggleFilter = (
    category: keyof Pick<SearchFilters, 'types' | 'services' | 'levels'>,
    value: string
  ) => {
    setFilters((prev) => {
      const current = prev[category]
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [category]: newValues }
    })
  }

  const clearFilters = () => {
    setFilters({
      types: [],
      services: [],
      levels: [],
      dateFrom: '',
      dateTo: '',
      regex: false,
      caseSensitive: false,
    })
  }

  const exportResults = () => {
    const data = JSON.stringify(results, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `search-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.services.length > 0 ||
    filters.levels.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.regex ||
    filters.caseSensitive

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Advanced Search</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Search across logs, configurations, audit trails, and system data
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-4 left-4 h-5 w-5 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs, configs, services, and more..."
            className="h-14 w-full rounded-lg border border-zinc-200 bg-white pr-12 pl-12 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          <div className="absolute top-3.5 right-3 flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters || hasActiveFilters ? 'primary' : 'secondary'}
              className="px-3 py-2 text-sm"
            >
              <Filter className="h-4 w-4" />
            </Button>
            {loading && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-400" />
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="space-y-6">
            {/* Type Filters */}
            {availableFilters.types.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                  <Type className="h-4 w-4" />
                  Result Types
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleFilter('types', type)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        filters.types.includes(type)
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {RESULT_TYPE_LABELS[type] || type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Service Filters */}
            {availableFilters.services.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                  <Activity className="h-4 w-4" />
                  Services
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.services.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleFilter('services', service)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        filters.services.includes(service)
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Level Filters */}
            {availableFilters.levels.length > 0 && (
              <div>
                <div className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">
                  Log Levels
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.levels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleFilter('levels', level)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        filters.levels.includes(level)
                          ? LEVEL_COLORS[level] + ' shadow-sm'
                          : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                <Calendar className="h-4 w-4" />
                Date Range
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">
                    From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateFrom: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={filters.regex}
                  onChange={(e) => setFilters((prev) => ({ ...prev, regex: e.target.checked }))}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                Regex Search
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={filters.caseSensitive}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      caseSensitive: e.target.checked,
                    }))
                  }
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                Case Sensitive
              </label>
            </div>

            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="secondary" className="w-full">
                <X className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results Header */}
      {query && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {loading ? (
              'Searching...'
            ) : (
              <>
                Found <strong>{total}</strong> results in <strong>{took}ms</strong>
              </>
            )}
          </div>
          {results.length > 0 && (
            <Button onClick={exportResults} variant="secondary" className="text-sm">
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {result.url ? (
                      <a
                        href={result.url}
                        className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {result.title}
                      </a>
                    ) : (
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {result.title}
                      </span>
                    )}
                    <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {RESULT_TYPE_LABELS[result.type] || result.type}
                    </span>
                    {result.level && (
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[result.level]}`}
                      >
                        {result.level}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {result.description}
                  </div>
                  {result.service && (
                    <div className="mt-2 text-xs text-zinc-500">
                      Service: <span className="font-medium">{result.service}</span>
                    </div>
                  )}
                </div>
                {result.timestamp && (
                  <div className="text-xs whitespace-nowrap text-zinc-400">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <SearchIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-white">
            No results found
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Try adjusting your search query or filters
          </p>
        </div>
      )}

      {!query && (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <SearchIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-white">
            Start Searching
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter a search query to find logs, configs, audit entries, and more
          </p>
        </div>
      )}
    </div>
  )
}
