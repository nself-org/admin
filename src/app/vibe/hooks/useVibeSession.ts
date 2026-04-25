'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type TargetEnv = 'local' | 'staging' | 'prod'
export type GenerationStatus = 'pending' | 'generating' | 'done' | 'error'
export type ApplyStatus = 'idle' | 'confirming' | 'applying' | 'done' | 'error'

export interface VibeSession {
  id: string
  target_env: TargetEnv
  created_at: string
}

export interface VibeGeneration {
  id: string
  session_id: string
  prompt: string
  migration_sql: string | null
  permissions_json: object | null
  ui_files: Record<string, string> | null
  status: GenerationStatus
  applied_at: string | null
  ai_model: string
  tokens_used: number | null
}

interface UseVibeSessionReturn {
  session: VibeSession | null
  generation: VibeGeneration | null
  applyStatus: ApplyStatus
  error: string | null
  isCreatingSession: boolean
  createSession: (targetEnv?: TargetEnv) => Promise<void>
  submitPrompt: (prompt: string) => Promise<void>
  applyGeneration: (confirmPhrase?: string) => Promise<void>
  resetGeneration: () => void
}

const VIBE_ENABLED = process.env.NEXT_PUBLIC_NSELF_VIBE_ENABLED !== 'false'

export function useVibeSession(): UseVibeSessionReturn {
  const [session, setSession] = useState<VibeSession | null>(null)
  const [generation, setGeneration] = useState<VibeGeneration | null>(null)
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const sessionCountRef = useRef(0)

  // Load session from localStorage on mount
  useEffect(() => {
    if (!VIBE_ENABLED) return
    const stored = localStorage.getItem('vibe_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as VibeSession
        // Validate session is less than 24h old
        const age = Date.now() - new Date(parsed.created_at).getTime()
        if (age < 24 * 60 * 60 * 1000) {
          setSession(parsed)
        } else {
          localStorage.removeItem('vibe_session')
        }
      } catch {
        localStorage.removeItem('vibe_session')
      }
    }
  }, [])

  const createSession = useCallback(async (targetEnv: TargetEnv = 'local') => {
    if (!VIBE_ENABLED) {
      setError('Vibe-Code is disabled. Set NSELF_VIBE_ENABLED=true to enable.')
      return
    }

    // Max 3 sessions per user (enforced by API, but check client-side too)
    if (sessionCountRef.current >= 3) {
      setError(
        'Maximum 3 active sessions reached. Close an existing session first.',
      )
      return
    }

    setIsCreatingSession(true)
    setError(null)

    try {
      const res = await fetch('/api/vibe/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_env: targetEnv }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const newSession = (await res.json()) as VibeSession
      setSession(newSession)
      setGeneration(null)
      sessionCountRef.current += 1
      localStorage.setItem('vibe_session', JSON.stringify(newSession))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setIsCreatingSession(false)
    }
  }, [])

  const submitPrompt = useCallback(
    async (prompt: string) => {
      if (!session) {
        setError('No active session. Create a session first.')
        return
      }

      if (!prompt.trim()) {
        setError('Prompt cannot be empty.')
        return
      }

      setError(null)
      setGeneration({
        id: '',
        session_id: session.id,
        prompt,
        migration_sql: null,
        permissions_json: null,
        ui_files: null,
        status: 'generating',
        applied_at: null,
        ai_model: 'claw-ai',
        tokens_used: null,
      })

      try {
        const res = await fetch('/api/vibe/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.id, prompt }),
        })

        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }

        const gen = (await res.json()) as VibeGeneration
        setGeneration(gen)
      } catch (err) {
        setGeneration((prev) => (prev ? { ...prev, status: 'error' } : null))
        setError(err instanceof Error ? err.message : 'Generation failed')
      }
    },
    [session],
  )

  const applyGeneration = useCallback(
    async (confirmPhrase?: string) => {
      if (!generation?.id) {
        setError('Nothing to apply.')
        return
      }

      // Prod requires "confirm-prod"
      if (session?.target_env === 'prod' && confirmPhrase !== 'confirm-prod') {
        setError('Production apply requires typing "confirm-prod" to confirm.')
        return
      }

      setApplyStatus('applying')
      setError(null)

      try {
        const res = await fetch('/api/vibe/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generation_id: generation.id,
            confirm: true,
            confirm_phrase: confirmPhrase,
          }),
        })

        if (!res.ok) {
          const body = (await res.json()) as {
            error?: string
            error_code?: string
          }
          if (body.error_code === 'requires_confirmation') {
            setApplyStatus('confirming')
            throw new Error('Apply requires explicit confirmation.')
          }
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }

        const result = (await res.json()) as { applied_at: string }
        setGeneration((prev) =>
          prev
            ? { ...prev, applied_at: result.applied_at, status: 'done' }
            : null,
        )
        setApplyStatus('done')
      } catch (err) {
        setApplyStatus('error')
        setError(err instanceof Error ? err.message : 'Apply failed')
      }
    },
    [generation, session],
  )

  const resetGeneration = useCallback(() => {
    setGeneration(null)
    setApplyStatus('idle')
    setError(null)
  }, [])

  return {
    session,
    generation,
    applyStatus,
    error,
    isCreatingSession,
    createSession,
    submitPrompt,
    applyGeneration,
    resetGeneration,
  }
}
