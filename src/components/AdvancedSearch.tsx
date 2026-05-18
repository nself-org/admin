'use client'

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { Activity, Calendar, Filter, Search as SearchIcon, Type, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './Button'

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

export function AdvancedSearch() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [took, setTook] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

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

  // Load available filters
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen])

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const performSearch = useCallback(async () => {
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

  const loadSuggestions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/search?action=suggestions&q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch {
      // Ignore errors
    }
  }, [query])

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([])
      setSuggestions([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch()
      loadSuggestions()
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, filters, performSearch, loadSuggestions])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setSuggestions([])
    setShowFilters(false)
  }, [])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.url) {
        router.push(result.url)
        handleClose()
      }
    },
    [router, handleClose]
  )

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

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.services.length > 0 ||
    filters.levels.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.regex ||
    filters.caseSensitive

  return (
    <>
      <button
        type="button"
        className="group flex h-6 w-6 items-center justify-center sm:justify-start md:h-auto md:w-72 md:flex-none md:rounded-lg md:py-2.5 md:pr-3.5 md:pl-4 md:text-sm md:ring-1 md:ring-zinc-200 md:hover:ring-zinc-300 lg:w-96 dark:md:bg-zinc-800/75 dark:md:ring-white/5 dark:md:ring-inset dark:md:hover:bg-zinc-700/40 dark:md:hover:ring-zinc-500"
        onClick={() => setIsOpen(true)}
      >
        <SearchIcon className="h-5 w-5 flex-none text-zinc-400 group-hover:text-zinc-500 md:group-hover:text-zinc-400 dark:text-zinc-500" />
        <span className="sr-only sm:not-sr-only sm:ml-2 sm:text-zinc-500 md:hidden lg:inline-block sm:dark:text-zinc-400">
          Search
        </span>
        <kbd className="ml-auto hidden font-medium text-zinc-400 md:block dark:text-zinc-500">
          <kbd className="font-sans">⌘</kbd>
          <kbd className="font-sans">K</kbd>
        </kbd>
      </button>

      <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-400/25 backdrop-blur-sm dark:bg-black/40" />
        <div className="fixed inset-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-20 md:py-32 lg:px-8 lg:py-[10vh]">
          <DialogPanel className="mx-auto max-w-3xl transform-gpu overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            {/* Search Input */}
            <div className="relative border-b border-zinc-200 dark:border-zinc-800">
              <SearchIcon className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search logs, configs, services, and more..."
                className="h-12 w-full border-0 bg-transparent pr-12 pl-11 text-zinc-800 placeholder:text-zinc-400 focus:outline-none sm:text-sm dark:text-white dark:placeholder:text-zinc-500"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`rounded p-1 transition ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  title="Toggle filters"
                  aria-label="Toggle filters"
                >
                  <Filter className="h-4 w-4" />
                </button>
                {loading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-400" />
                )}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="space-y-4">
                  {/* Type Filters */}
                  {availableFilters.types.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Type className="h-3.5 w-3.5" />
                        Result Types
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableFilters.types.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleFilter('types', type)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              filters.types.includes(type)
                                ? 'bg-blue-600 text-white'
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
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Activity className="h-3.5 w-3.5" />
                        Services
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableFilters.services.slice(0, 10).map((service) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => toggleFilter('services', service)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              filters.services.includes(service)
                                ? 'bg-blue-600 text-white'
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
                      <div className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Log Levels
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableFilters.levels.map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => toggleFilter('levels', level)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              filters.levels.includes(level)
                                ? LEVEL_COLORS[level]
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
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <Calendar className="h-3.5 w-3.5" />
                      Date Range
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateFrom: e.target.value,
                          }))
                        }
                        aria-label="Date from"
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <span className="text-zinc-400">to</span>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateTo: e.target.value,
                          }))
                        }
                        aria-label="Date to"
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={filters.regex}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            regex: e.target.checked,
                          }))
                        }
                        className="rounded border-zinc-300 dark:border-zinc-600"
                      />
                      Regex
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
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
                    <Button onClick={clearFilters} variant="secondary" className="w-full text-xs">
                      <X className="mr-1 h-3.5 w-3.5" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && !results.length && (
              <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Suggestions
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Found {total} results in {took}ms
                  </div>
                </div>
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(result)}
                        className="block w-full px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 dark:text-white">
                                {result.title}
                              </span>
                              <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {RESULT_TYPE_LABELS[result.type] || result.type}
                              </span>
                              {result.level && (
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${LEVEL_COLORS[result.level]}`}
                                >
                                  {result.level}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {result.description}
                            </div>
                            {result.service && (
                              <div className="mt-1 text-xs text-zinc-500">
                                Service: {result.service}
                              </div>
                            )}
                          </div>
                          {result.timestamp && (
                            <div className="text-xs whitespace-nowrap text-zinc-400">
                              {new Date(result.timestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {query && !loading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No results found for &quot;{query}&quot;
              </div>
            )}

            {!query && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Start typing to search across logs, configs, and more...
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
