/**
 * Vibe-Code Generate API
 * POST /api/vibe/generate — submit a feature request prompt for generation
 *
 * Proxies to vibe_api CS_2 (port 8002). Returns a VibeGeneration object.
 * The vibe_api runs VibeAgent which calls specialist sub-agents:
 *   MigrationAgent, PermissionsAgent, UIAgent
 */

import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const VIBE_ENABLED = process.env.NSELF_VIBE_ENABLED === 'true'
const VIBE_API_PORT = process.env.NSELF_VIBE_PORT ?? '8003'
const VIBE_API_BASE = `http://127.0.0.1:${VIBE_API_PORT}`
const MAX_PROMPT_TOKENS = parseInt(
  process.env.NSELF_VIBE_MAX_PROMPT_TOKENS ?? '16000',
  10,
)

const GenerateSchema = z.object({
  session_id: z.string().min(1),
  prompt: z.string().min(1).max(4000),
})

// Rate limit: max 1 generate-in-flight per session (tracked by session_id)
const inflightSessions = new Set<string>()

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  if (!VIBE_ENABLED) {
    return NextResponse.json(
      { error: 'Vibe-Code is disabled. Set NSELF_VIBE_ENABLED=true.' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = GenerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { session_id, prompt } = parsed.data

  // Prompt injection guard: strip dangerous patterns before forwarding
  const sanitizedPrompt = sanitizePrompt(prompt)

  if (inflightSessions.has(session_id)) {
    return NextResponse.json(
      { error: 'A generation is already in progress for this session.' },
      { status: 429 },
    )
  }

  inflightSessions.add(session_id)

  try {
    let generationData: object

    try {
      const vibeRes = await fetch(`${VIBE_API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          prompt: sanitizedPrompt,
          max_tokens: MAX_PROMPT_TOKENS,
          ai_provider: process.env.NSELF_VIBE_AI_PROVIDER ?? 'claw-ai',
          ui_framework: process.env.NSELF_VIBE_UI_FRAMEWORK ?? 'react',
        }),
        signal: AbortSignal.timeout(35000), // 35s: spec says 30s p50
      })

      if (!vibeRes.ok) {
        const errBody = (await vibeRes.json()) as { error?: string }
        throw new Error(errBody.error ?? `vibe_api error: ${vibeRes.status}`)
      }

      generationData = (await vibeRes.json()) as object
    } catch (fetchErr) {
      if (
        (fetchErr as Error).message.includes('ECONNREFUSED') ||
        (fetchErr as Error).message.includes('fetch failed') ||
        (fetchErr as Error).name === 'TimeoutError'
      ) {
        return NextResponse.json(
          {
            error:
              'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
            service: 'vibe_api',
          },
          {
            status: 503,
            headers: { 'X-Service-Required': 'vibe_api' },
          },
        )
      }
      throw fetchErr
    }

    return NextResponse.json(generationData)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    inflightSessions.delete(session_id)
  }
}

/**
 * Sanitize prompt to prevent injection of dangerous DDL.
 * The MigrationAgent also validates output, but this is defense-in-depth.
 */
function sanitizePrompt(prompt: string): string {
  // Strip common SQL injection patterns from the prompt text
  // We don't block legitimate mentions of SQL keywords in feature descriptions
  // Just strip explicit executable injection attempts
  return prompt
    .replace(
      /;\s*(DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*;|ALTER\s+TABLE)/gi,
      '; [BLOCKED DDL]',
    )
    .trim()
}

