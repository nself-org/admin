'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { HelpArticle } from '@/data/help-content'
import { ArrowLeft, Clock, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { Suspense } from 'react'

function HelpSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = React.useState(initialQuery)
  const [results, setResults] = React.useState<HelpArticle[]>([])
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')

  React.useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- performSearch is stable (defined in same component scope without useCallback); adding it creates unnecessary re-runs
  }, [initialQuery])

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/help/search?q=${encodeURIComponent(query)}&category=${selectedCategory === 'all' ? '' : selectedCategory}`
      )
      const data = await response.json()
      if (data.success) {
        setResults(data.results || [])
        setSuggestions(data.suggestions || [])
      }
    } catch (_error) {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/help/search?q=${encodeURIComponent(searchQuery)}`)
      performSearch(searchQuery)
    }
  }

  const categories = [
    'all',
    'getting-started',
    'services',
    'database',
    'deployment',
    'troubleshooting',
    'api',
    'cli',
  ]

  return (
    <>
      <PageHeader
        title="Search Help Articles"
        description="Search through documentation, guides, and troubleshooting articles"
      />
      <PageContent>
        <div className="space-y-6">
          {/* Search Bar */}
          <Card className="p-6">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search for help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-base"
                />
              </div>
            </form>

            {/* Category Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category)
                    if (searchQuery.trim()) {
                      performSearch(searchQuery)
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {category === 'all'
                    ? 'All Categories'
                    : category
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                </button>
              ))}
            </div>
          </Card>

          {/* Back to Help Center */}
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </Link>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card className="p-4">
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Did you mean:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery(suggestion)
                      performSearch(suggestion)
                    }}
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="mb-3 h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
              </h2>
              <div className="space-y-4">
                {results.map((article) => (
                  <Link key={article.id} href={`/help/article/${article.id}`}>
                    <Card className="p-4 transition-shadow hover:shadow-md">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {article.title}
                        </h3>
                        <Badge variant="outline">{article.category}</Badge>
                      </div>
                      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{article.readTime} min read</span>
                        </div>
                        <span>Updated {article.updatedAt}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!isLoading && searchQuery && results.length === 0 && (
            <Card className="p-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <h3 className="mb-2 text-lg font-semibold">No results found</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We couldn't find any articles matching "{searchQuery}"
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Try different keywords or browse our help categories
              </p>
            </Card>
          )}
        </div>
      </PageContent>
    </>
  )
}

export default function HelpSearchPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <HelpSearchContent />
    </Suspense>
  )
}
