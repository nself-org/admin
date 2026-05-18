/**
 * Terminal API Route
 *
 * Executes nself CLI commands and streams output.
 * SECURITY: Only nself sub-commands are permitted — no arbitrary shell execution.
 */

import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'

// Strict safe-arg validation — same pattern as /api/nself/route.ts
const SAFE_ARG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-.:=/]*$/

function validateSafeArg(arg: string): boolean {
  return (
    SAFE_ARG_PATTERN.test(arg) &&
    !arg.includes('..') &&
    !arg.includes('&&') &&
    !arg.includes('||') &&
    !arg.includes(';') &&
    !arg.includes('`') &&
    !arg.includes('$(') &&
    !arg.includes('|')
  )
}

// Allowlist of nself sub-commands permitted from the terminal.
// Never add arbitrary commands — only nself sub-commands.
const ALLOWED_SUBCOMMANDS = new Set([
  'status',
  'doctor',
  'urls',
  'help',
  'version',
  'logs',
  'ps',
  'info',
  'plugin',
  'license',
  'update',
  'env',
  'ssl',
  'trust',
  'validate',
  'config',
])

/**
 * POST /api/ws/terminal
 *
 * Body: { command: string; args?: string[] }
 *   command — an nself sub-command from the allowlist
 *   args    — validated safe arguments for the sub-command
 *
 * Returns: Server-Sent Events stream of output lines.
 */
export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let body: { command?: unknown; args?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { command, args = [] } = body

  // Validate command is a non-empty string
  if (!command || typeof command !== 'string' || !command.trim()) {
    return NextResponse.json({ error: 'command is required' }, { status: 400 })
  }

  // Enforce nself-prefix-only: only allowlisted sub-commands
  const subCmd = command.trim().toLowerCase()
  if (!ALLOWED_SUBCOMMANDS.has(subCmd)) {
    return NextResponse.json(
      {
        error: `Command '${subCmd}' is not allowed. Only nself sub-commands are permitted.`,
        allowed: Array.from(ALLOWED_SUBCOMMANDS).sort(),
      },
      { status: 403 }
    )
  }

  // Validate args
  if (!Array.isArray(args)) {
    return NextResponse.json({ error: 'args must be an array' }, { status: 400 })
  }

  const validatedArgs: string[] = []
  for (const arg of args) {
    if (typeof arg !== 'string') {
      return NextResponse.json({ error: 'All arguments must be strings' }, { status: 400 })
    }
    const trimmed = arg.trim()
    if (!trimmed) continue
    if (!validateSafeArg(trimmed)) {
      return NextResponse.json(
        { error: `Argument contains unsafe characters: ${trimmed}` },
        { status: 400 }
      )
    }
    if (trimmed.length > 256) {
      return NextResponse.json(
        { error: `Argument too long: ${trimmed.slice(0, 32)}…` },
        { status: 400 }
      )
    }
    validatedArgs.push(trimmed)
  }

  // Locate the nself binary
  let nselfBin: string
  try {
    nselfBin = await findNselfPath()
  } catch {
    return NextResponse.json({ error: 'nself binary not found on PATH' }, { status: 503 })
  }

  const projectPath = getProjectPath()
  const fullArgs = [subCmd, ...validatedArgs]

  // Stream output via Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()

      function emit(type: string, data: string) {
        const lines = data.split('\n')
        for (const line of lines) {
          controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(line)}\n\n`))
        }
      }

      const child = spawn(nselfBin, fullArgs, {
        cwd: projectPath,
        env: {
          ...process.env,
          PATH: getEnhancedPath(),
          NSELF_PROJECT_PATH: projectPath,
          TERM: 'dumb',
        },
        timeout: 120_000, // 2 min max
      })

      // Emit the command being run
      controller.enqueue(
        enc.encode(`event: start\ndata: ${JSON.stringify(`$ nself ${fullArgs.join(' ')}`)}\n\n`)
      )

      child.stdout.on('data', (chunk: Buffer) => {
        emit('stdout', chunk.toString())
      })

      child.stderr.on('data', (chunk: Buffer) => {
        emit('stderr', chunk.toString())
      })

      child.on('close', (code) => {
        controller.enqueue(enc.encode(`event: exit\ndata: ${JSON.stringify({ code })}\n\n`))
        controller.close()
      })

      child.on('error', (err) => {
        emit('error', err.message)
        controller.enqueue(enc.encode(`event: exit\ndata: ${JSON.stringify({ code: 1 })}\n\n`))
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * GET /api/ws/terminal
 * Returns the list of allowed commands for the terminal UI.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  return NextResponse.json({
    allowed: Array.from(ALLOWED_SUBCOMMANDS).sort(),
    description: 'Only nself sub-commands from this list are executable via the terminal.',
  })
}
