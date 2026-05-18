'use client'

import { AlertCircle, CheckCircle, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export default function InitEdit() {
  const router = useRouter()
  const [status, setStatus] = useState<'resetting' | 'loading' | 'success' | 'error'>('resetting')
  const [message, setMessage] = useState('Resetting project for editing...')
  const [errorMessage, setErrorMessage] = useState('')

  const handleEdit = useCallback(async () => {
    try {
      setMessage('Preserving your configuration...')

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      // Call the reset API with edit mode
      const response = await fetch('/api/nself/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ mode: 'edit' }),
      })

      if (response.ok) {
        setStatus('loading')
        setMessage('Loading existing configuration...')

        // Small delay to show the loading state
        setTimeout(() => {
          setStatus('success')
          setMessage('Configuration loaded, redirecting to setup...')

          // Wait 500ms then redirect to step 1 with existing config
          setTimeout(() => {
            router.push('/init/1')
          }, 500)
        }, 800)
      } else {
        const data = await response.json()
        setStatus('error')
        setErrorMessage(data.error || 'Failed to prepare for editing')
        setMessage('Edit preparation failed')

        // Redirect to start page after showing error
        setTimeout(() => {
          router.push('/start')
        }, 2000)
      }
    } catch (error) {
      console.error('Error preparing for edit:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
      setMessage('Edit preparation failed')

      setTimeout(() => {
        router.push('/start')
      }, 2000)
    }
  }, [router])

  useEffect(() => {
    handleEdit()
  }, [handleEdit])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          {/* Icon/Spinner */}
          <div className="mb-6 flex justify-center">
            {status === 'resetting' && (
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400"></div>
            )}
            {status === 'loading' && (
              <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {status === 'success' && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          {/* Message */}
          <h2
            className={`text-lg font-medium ${
              status === 'error'
                ? 'text-red-900 dark:text-red-200'
                : 'text-zinc-900 dark:text-white'
            }`}
          >
            {message}
          </h2>

          {errorMessage && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
