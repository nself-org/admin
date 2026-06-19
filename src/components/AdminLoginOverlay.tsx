/**
 * AdminLoginOverlay — re-authentication overlay shown when the 24h LokiJS
 * session expires.
 *
 * Purpose: Allow users to renew their admin session without navigating away
 *   from the current panel.
 * Inputs: onSuccess callback (called after successful re-auth)
 * Outputs: renders a modal overlay with a password input
 * Constraints:
 *   - Session check happens via POST /api/auth/refresh (server-side LokiJS
 *     session store); client-side state cannot bypass this.
 *   - On success: calls onSuccess so the parent panel can re-fetch data.
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: session-expiry re-auth overlay
 */

'use client'

import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'

interface AdminLoginOverlayProps {
  /** Called after a successful re-authentication. */
  onSuccess: () => void
}

export function AdminLoginOverlay({ onSuccess }: AdminLoginOverlayProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Get CSRF token from cookie (matches existing admin auth pattern)
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken ?? '',
        },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setPassword('')
        onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Incorrect password. Try again.')
      }
    } catch {
      setError('Network error — check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Lock className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Session expired
          </h2>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Your admin session has expired. Enter your password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
