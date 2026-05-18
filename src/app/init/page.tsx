'use client'

import { FormSkeleton } from '@/components/skeletons'
import { safeNavigate } from '@/lib/routing'
import { AlertCircle, CheckCircle, Folder, Hammer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

function InitContent() {
  const router = useRouter()
  const [status, setStatus] = useState<
    'checking' | 'initializing' | 'ready' | 'built' | 'error'
  >('checking')
  const [message, setMessage] = useState('Checking project status...')
  const [errorDetail, setErrorDetail] = useState<string>('')
  const hasChecked = useRef(false)

  const checkAndInitializeProject = useCallback(async () => {
    try {
      // Check if project has been initialized (has .env.local)
      const response = await fetch('/api/project/status')

      if (response.ok) {
        const data = await response.json()

        if (data.isBuilt && data.hasEnvFile) {
          // Project is already built
          setStatus('built')
          setMessage('Project is already built, redirecting to start page...')

          setTimeout(() => {
            safeNavigate(router, '/start')
          }, 500)
        } else if (data.hasEnvFile) {
          // Has env file but not built, continue to wizard
          setStatus('ready')
          setMessage('Configuration found, loading setup wizard...')

          setTimeout(() => {
            safeNavigate(router, '/init/1')
          }, 500)
        } else {
          // No env file, need to run nself init --full
          setStatus('initializing')
          setMessage('Initializing new project...')

          // Clear wizard state when starting fresh
          localStorage.removeItem('wizard_visited_steps')
          localStorage.removeItem('wizard_environment')
          localStorage.removeItem('wizard_step1_cache')

          // Run nself init --full
          const initResponse = await fetch('/api/nself/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })

          if (initResponse.ok) {
            setStatus('ready')
            setMessage('Project initialized, starting setup wizard...')

            setTimeout(() => {
              safeNavigate(router, '/init/1')
            }, 500)
          } else {
            // Show inline error with Retry option — do not silently redirect (ADM-T03)
            let detail = 'Unknown error'
            try {
              const errData = await initResponse.json()
              detail = errData.details || errData.error || detail
            } catch {
              // ignore parse failure
            }
            setErrorDetail(detail)
            setStatus('error')
            setMessage('Failed to initialize project')
          }
        }
      } else {
        // If error checking status, go to wizard anyway
        safeNavigate(router, '/init/1')
      }
    } catch (error) {
      console.error('Error checking project status:', error)
      setErrorDetail(error instanceof Error ? error.message : 'Unknown error')
      setStatus('error')
      setMessage('Failed to check project status')
    }
  }, [router])

  const handleRetry = useCallback(() => {
    hasChecked.current = false
    setStatus('checking')
    setMessage('Checking project status...')
    setErrorDetail('')
    checkAndInitializeProject()
  }, [checkAndInitializeProject])

  useEffect(() => {
    // Prevent multiple checks
    if (!hasChecked.current) {
      hasChecked.current = true
      checkAndInitializeProject()
    }
  }, [checkAndInitializeProject])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          {/* Icon/Spinner */}
          <div className="mb-6 flex justify-center">
            {status === 'checking' && (
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400"></div>
            )}
            {status === 'initializing' && (
              <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Folder className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {status === 'ready' && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'built' && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <Hammer className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          {/* Message */}
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
            {message}
          </h2>

          {/* Error detail + Retry (ADM-T03) */}
          {status === 'error' && (
            <div className="mt-4 max-w-sm space-y-3">
              {errorDetail && (
                <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {errorDetail}
                </p>
              )}
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InitPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <InitContent />
    </Suspense>
  )
}
