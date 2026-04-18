'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ErrorCode {
  code: string
  category: string
  summary: string
  why: string
  fix: string
  docsPath: string
}

interface ApiResponse {
  success: boolean
  codes: ErrorCode[]
  categories: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  docker: 'Docker',
  config: 'Config',
  plugin: 'Plugin / License',
  ssl: 'SSL',
  network: 'Network',
  database: 'Database',
  health: 'Health',
  init: 'Init / Project',
  domain: 'Domain',
  auth: 'Auth',
  build: 'Build',
  dr: 'Disaster Recovery',
  upgrade: 'Upgrade',
  onboarding: 'Onboarding',
  import: 'Import',
}

const CATEGORY_COLORS: Record<string, string> = {
  docker: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  config:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  plugin:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ssl: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  network:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  database: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  health:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  init: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  domain: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  auth: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  build: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
  dr: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  upgrade: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  onboarding:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  import:
    'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
}

function getCategoryColor(category: string): string {
  return (
    CATEGORY_COLORS[category] ??
    'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
  )
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

function ErrorRow({ entry }: { entry: ErrorCode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 shrink-0 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {entry.code}
        </span>
        <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
          {entry.summary}
        </span>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${getCategoryColor(entry.category)}`}
        >
          {getCategoryLabel(entry.category)}
        </span>
        <span className="mt-0.5 ml-1 shrink-0 text-zinc-400">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-white/[0.02]">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Why
              </dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                {entry.why}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Fix
              </dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                {entry.fix}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Docs
              </dt>
              <dd className="mt-0.5">
                <a
                  href={`https://docs.nself.org/${entry.docsPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  docs.nself.org/{entry.docsPath}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

export default function ErrorCodesPage() {
  const [codes, setCodes] = useState<ErrorCode[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/errors')
      .then((res) => res.json() as Promise<ApiResponse>)
      .then((data) => {
        if (data.success) {
          setCodes(data.codes)
          setCategories(data.categories)
        } else {
          setError('Failed to load error codes.')
        }
      })
      .catch(() => {
        setError('Failed to load error codes.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filtered = codes.filter((entry) => {
    const matchesCategory =
      selectedCategory === null || entry.category === selectedCategory

    const term = search.trim().toLowerCase()
    if (!term) return matchesCategory

    const matchesSearch =
      entry.code.toLowerCase().includes(term) ||
      entry.summary.toLowerCase().includes(term) ||
      entry.category.toLowerCase().includes(term)

    return matchesCategory && matchesSearch
  })

  return (
    <>
      <PageHeader
        title="Error Codes"
        description="Reference for all nSelf CLI error codes with causes and fixes."
        breadcrumbs={[
          { label: 'Help', href: '/help' },
          { label: 'Error Codes' },
        ]}
      />
      <PageContent>
        <div className="space-y-6">
          {/* Search and filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="search"
                placeholder="Search by code, summary, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search error codes"
              />
            </div>
          </div>

          {/* Category filter buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setSelectedCategory((prev) => (prev === cat ? null : cat))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading && (
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500" />
                Loading error codes...
              </div>
            </Card>
          )}

          {!loading && error && (
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </Card>
          )}

          {!loading && !error && filtered.length === 0 && (
            <Card className="p-6">
              <p className="text-sm text-zinc-500">
                No error codes match your search.
              </p>
            </Card>
          )}

          {!loading && !error && filtered.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
                <span className="text-xs text-zinc-500">
                  {filtered.length} {filtered.length === 1 ? 'code' : 'codes'}
                  {search.trim() || selectedCategory ? ' matching' : ' total'}
                </span>
                <span className="text-xs text-zinc-400">
                  Click a row to see details
                </span>
              </div>
              {filtered.map((entry) => (
                <ErrorRow key={entry.code} entry={entry} />
              ))}
            </Card>
          )}
        </div>
      </PageContent>
    </>
  )
}
