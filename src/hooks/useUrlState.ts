'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

/**
 * useUrlState — sync a single state value to a URL search param.
 *
 * Vocabulary (locked per P94 S35 spec):
 *   ?tab=<name>          active tab
 *   ?q=<text>            search query
 *   ?since=<duration>    time-range (e.g. "5m", "1h", "24h")
 *   ?filter.<key>=<val>  arbitrary filter key
 *   ?cursor=<opaque>     pagination cursor
 *   ?selected=<id>       selected row ID
 *
 * @param key           URL search param key (e.g. "tab", "q", "since")
 * @param defaultValue  Value when the param is absent
 * @param opts.pushMode 'replace' (default) — no back-stack entry; 'push' — adds entry
 * @param opts.debounce ms delay before writing URL (useful for text inputs)
 */
export function useUrlState<T extends string | null>(
  key: string,
  defaultValue: T,
  opts?: { pushMode?: 'replace' | 'push'; debounce?: number },
): [T, (v: T) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pushMode = opts?.pushMode ?? 'replace'
  const debounceMs = opts?.debounce ?? 0

  const raw = searchParams.get(key)
  const value = (raw !== null ? raw : defaultValue) as T

  // Debounce timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const setValue = useCallback(
    (newValue: T) => {
      const doUpdate = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (newValue === null || newValue === defaultValue) {
          params.delete(key)
        } else {
          params.set(key, String(newValue))
        }
        const queryString = params.toString()
        const url = queryString ? `${pathname}?${queryString}` : pathname
        if (pushMode === 'push') {
          router.push(url)
        } else {
          router.replace(url)
        }
      }

      if (debounceMs > 0) {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(doUpdate, debounceMs)
      } else {
        doUpdate()
      }
    },
    [router, pathname, searchParams, key, defaultValue, pushMode, debounceMs],
  )

  return [value, setValue]
}
