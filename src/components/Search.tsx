'use client'

import { navigation } from '@/lib/navigation'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { Search as SearchIcon, Zap } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMobileNavigationStore } from './MobileNavigation'

type SearchResult = {
  title: string
  url: string
  description?: string
}

// Generate search results from navigation structure
const allSearchResults: SearchResult[] = navigation.flatMap((group) =>
  group.links.map((link) => ({
    title: `${link.title}`,
    url: link.href,
    description: `${group.title} > ${link.title}`,
  }))
)

export function Search() {
  let router = useRouter()
  let pathname = usePathname()
  let [isOpen, setIsOpen] = useState(false)
  let [query, setQuery] = useState('')
  let [results, setResults] = useState<SearchResult[]>([])
  let inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (query.length > 0) {
      const filtered = allSearchResults.filter(
        (result) =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.description?.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered.slice(0, 10)) // Limit to 10 results
    } else {
      setResults([])
    }
  }, [query])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const handleSelect = useCallback(
    (url: string) => {
      router.push(url)
      handleClose()
    },
    [router, handleClose]
  )

  return (
    <>
      <button
        type="button"
        className="group flex h-6 w-6 items-center justify-center sm:justify-start md:h-auto md:w-72 md:flex-none md:rounded-lg md:py-2.5 md:pr-3.5 md:pl-4 md:text-sm md:ring-1 md:ring-zinc-200 md:hover:ring-zinc-300 lg:w-96 dark:md:bg-zinc-800/75 dark:md:ring-white/5 dark:md:ring-inset dark:md:hover:bg-zinc-700/40 dark:md:hover:ring-zinc-500"
        onClick={() => setIsOpen(true)}
      >
        <SearchIcon className="h-5 w-5 flex-none text-zinc-400 group-hover:text-zinc-500 md:group-hover:text-zinc-400 dark:text-zinc-500" />
        <span className="sr-only sm:not-sr-only sm:ml-2 sm:text-zinc-500 md:hidden lg:inline-block sm:dark:text-zinc-400">
          Search Navigation
        </span>
        <kbd className="ml-auto hidden font-medium text-zinc-400 md:block dark:text-zinc-500">
          <kbd className="font-sans">⌘</kbd>
          <kbd className="font-sans">K</kbd>
        </kbd>
      </button>

      <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-400/25 backdrop-blur-sm dark:bg-black/40" />
        <div className="fixed inset-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-20 md:py-32 lg:px-8 lg:py-[15vh]">
          <DialogPanel className="mx-auto max-w-xl transform-gpu overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            <div className="relative">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 fill-zinc-400 dark:fill-zinc-500"
              >
                <path d="M12.01 12a4.25 4.25 0 1 0-6.02 0l-3.197 3.197a1.5 1.5 0 0 0-.003 2.118 1.5 1.5 0 0 0 2.121.003L8.01 14.217A4.21 4.21 0 0 0 12.01 12Zm-3.507-1.493a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-12 w-full border-0 bg-transparent pr-4 pl-11 text-zinc-800 placeholder:text-zinc-400 focus:outline-none sm:text-sm dark:text-white dark:placeholder:text-zinc-500"
                autoFocus
              />
            </div>
            {results.length > 0 && (
              <>
                <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Navigation Results
                    </div>
                    <a
                      href="/search"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Zap className="h-3 w-3" />
                      Advanced Search
                    </a>
                  </div>
                </div>
                <ul className="max-h-72 scroll-py-2 overflow-y-auto py-2 text-sm text-zinc-800 dark:text-zinc-200">
                  {results.map((result) => (
                    <li key={result.url}>
                      <button
                        type="button"
                        onClick={() => handleSelect(result.url)}
                        className="block w-full px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-zinc-600 dark:text-zinc-400">
                            {result.description}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {query && results.length === 0 && (
              <div className="border-t border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                No results found
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export function MobileSearch() {
  let pathname = usePathname()
  let isInsideMobileNav = useMobileNavigationStore((s) => s.isOpen)
  let [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isInsideMobileNav) {
      setIsOpen(false)
    }
  }, [isInsideMobileNav])

  return (
    <div className="contents lg:hidden">
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-zinc-900/5 dark:hover:bg-white/5"
        aria-label="Search"
        onClick={() => setIsOpen(true)}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="h-5 w-5 stroke-zinc-900 dark:stroke-white"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12.01 12a4.25 4.25 0 1 0-6.02 0l-3.197 3.197a1.5 1.5 0 0 0-.003 2.118 1.5 1.5 0 0 0 2.121.003L8.01 14.217A4.21 4.21 0 0 0 12.01 12Zm-3.507-1.493a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z"
          />
        </svg>
      </button>
      {isOpen && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          className="fixed inset-0 z-50 lg:hidden"
        >
          <DialogBackdrop className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-zinc-900/80" />
          <DialogPanel className="fixed inset-0 z-50 overflow-y-auto bg-white px-4 pt-20 pb-4 dark:bg-zinc-900">
            <Search />
          </DialogPanel>
        </Dialog>
      )}
    </div>
  )
}
