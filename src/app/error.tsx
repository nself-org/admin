'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console in all environments
    console.error('Application error:', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-xl dark:bg-zinc-800">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-white">
          Something went wrong
        </h1>

        <p className="mb-6 text-center text-zinc-600 dark:text-zinc-400">
          {isDev
            ? 'An error occurred. See details below.'
            : 'An unexpected error occurred. Please try again.'}
        </p>

        {isDev && (
          <div className="mb-6 overflow-hidden rounded-lg bg-zinc-900 p-4">
            <p className="mb-2 font-mono text-sm font-semibold text-red-400">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="max-h-48 overflow-auto text-xs text-zinc-400">{error.stack}</pre>
            )}
            {error.digest && <p className="mt-2 text-xs text-zinc-500">Digest: {error.digest}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded-lg bg-zinc-200 px-4 py-3 font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
