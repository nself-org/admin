/**
 * Plugin Logs API — SSE streaming endpoint
 * GET /api/plugins/[name]/logs
 *   ?lines=100     Number of lines to return (default 100)
 *   &follow=true   Stream in real time via SSE
 *
 * Delegates to: nself plugin logs <name> [--lines N] [--follow]
 * Streaming output returns text/event-stream for follow mode,
 * plain JSON for non-follow mode.
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec, spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface RouteContext {
  params: Promise<{ name: string }>
}

// ── Non-streaming: return last N lines as JSON ────────────────────────────────

async function getLogsSnapshot(
  name: string,
  lines: number,
  nselfPath: string,
  projectPath: string,
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { stdout, stderr } = await execAsync(
      `${nselfPath} plugin logs ${name} --lines ${lines} --no-follow --no-color`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 15000,
      },
    )

    const output = stdout || stderr || ''
    const logLines = output.split('\n').filter(Boolean)

    logger.api('GET', `/api/plugins/${name}/logs`, 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      plugin: name,
      lines: logLines,
      count: logLines.length,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }

    // Plugin not installed or no logs available — return empty rather than error
    if (
      err.message?.includes('not installed') ||
      err.message?.includes('not found') ||
      err.message?.includes('No log')
    ) {
      return NextResponse.json({
        success: true,
        plugin: name,
        lines: [],
        count: 0,
        note: 'No logs available yet',
      })
    }

    logger.error('Failed to get plugin logs', { name, error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve plugin logs',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// ── SSE streaming: follow mode ────────────────────────────────────────────────

async function streamLogs(
  name: string,
  lines: number,
  nselfPath: string,
  projectPath: string,
  signal: AbortSignal,
): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn(
        nselfPath,
        ['plugin', 'logs', name, '--lines', String(lines), '--follow', '--no-color'],
        {
          cwd: projectPath,
          env: { ...process.env, PATH: getEnhancedPath() },
        },
      )

      const sendEvent = (data: string) => {
        const sseData = `data: ${JSON.stringify({ line: data, ts: Date.now() })}\n\n`
        controller.enqueue(encoder.encode(sseData))
      }

      child.stdout.on('data', (chunk: Buffer) => {
        const lines_out = chunk.toString().split('\n')
        for (const line of lines_out) {
          if (line.trim()) sendEvent(line)
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        const lines_out = chunk.toString().split('\n')
        for (const line of lines_out) {
          if (line.trim()) sendEvent(line)
        }
      })

      child.on('error', (err) => {
        logger.error('Plugin log stream error', { name, error: err.message })
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err.message, ts: Date.now() })}\n\n`,
          ),
        )
        controller.close()
      })

      child.on('close', () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      })

      // Kill child process when client disconnects
      signal.addEventListener('abort', () => {
        child.kill('SIGTERM')
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse | Response> {
  const { name } = await context.params

  // Validate plugin name
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid plugin name format' },
      { status: 400 },
    )
  }

  const { searchParams } = new URL(request.url)
  const lines = Math.min(
    parseInt(searchParams.get('lines') || '100', 10),
    5000, // cap at 5000 lines
  )
  const follow = searchParams.get('follow') === 'true'

  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    if (follow) {
      return streamLogs(name, lines, nselfPath, projectPath, request.signal)
    }

    return getLogsSnapshot(name, lines, nselfPath, projectPath)
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Plugin logs request failed', { name, error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to access plugin logs',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
