/**
 * GraphQLPlaygroundPanel — admin panel for the embedded Hasura GraphQL playground.
 *
 * Purpose: Provide admins direct access to the Hasura GraphQL console
 *   via iframe embed. All 7 AsyncScreen states handled.
 * Inputs: /api/graphql/endpoint (returns the Hasura console URL + admin secret)
 * Outputs: iframe with the Hasura console URL; fallback states
 * Constraints:
 *   - Offline = stack not running (Hasura unreachable)
 *   - Empty state not expected (Hasura is always configured when stack runs)
 *   - Error = endpoint unavailable
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: GraphQLPlaygroundPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { useStackStatus } from '@/hooks/useStackStatus'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphQLEndpoint {
  consoleUrl: string
  endpoint: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GraphQLPlaygroundPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [result, setResult] = useState<Result<GraphQLEndpoint> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchEndpoint = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/graphql/endpoint')
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: GraphQLEndpoint = await res.json()
      setResult(ok(data))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchEndpoint()
  }, [fetchEndpoint, stackIsDown])

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    return 'ready'
  })()

  const endpoint = result?.ok ? result.value : null

  return (
    <section aria-label="GraphQL Playground" className="space-y-4">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchEndpoint()
          }}
        />
      )}

      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={fetchEndpoint}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
      >
        {endpoint && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Hasura GraphQL Console
              </p>
              <a
                href={endpoint.consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Open in new tab
              </a>
            </div>
            <iframe
              src={endpoint.consoleUrl}
              title="Hasura GraphQL Console"
              className="h-[600px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </AsyncScreen>
    </section>
  )
}
