import { streamNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { EventType, LogStreamEvent } from '@/lib/websocket/events'
import { getWebSocketServer } from '@/lib/websocket/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Parse log line to detect level
 */
function parseLogLevel(line: string): 'info' | 'warn' | 'error' | 'debug' {
  const upperLine = line.toUpperCase()

  if (
    upperLine.includes('ERROR') ||
    upperLine.includes('FATAL') ||
    upperLine.includes('CRITICAL')
  ) {
    return 'error'
  } else if (upperLine.includes('WARN') || upperLine.includes('WARNING')) {
    return 'warn'
  } else if (upperLine.includes('DEBUG')) {
    return 'debug'
  }

  return 'info'
}

/**
 * GET /api/logs/stream - Start WebSocket log streaming
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const service = searchParams.get('service') || 'all'
  const lines = searchParams.get('lines') || '100'
  const follow = searchParams.get('follow') === 'true'

  try {
    const wsServer = getWebSocketServer()

    // Set up log streaming via nself CLI
    const args = []
    if (service && service !== 'all') args.push(service)
    args.push(`-n${lines}`)
    if (follow) args.push('-f')

    const cleanup = streamNselfCommand(
      'logs',
      args,
      (data) => {
        // Parse log data and broadcast via WebSocket
        const lines = data.split('\n').filter((line) => line.trim())

        lines.forEach((line) => {
          const logEvent: LogStreamEvent = {
            service: service,
            line: line,
            timestamp: new Date().toISOString(),
            level: parseLogLevel(line),
            source: 'stdout',
          }

          // Broadcast to appropriate rooms
          if (service && service !== 'all') {
            wsServer.broadcastToRoom(
              `logs:${service}`,
              EventType.LOGS_STREAM,
              logEvent,
            )
          }
          wsServer.broadcastToRoom('logs:all', EventType.LOGS_STREAM, logEvent)
        })
      },
      (error) => {
        console.error('Log stream error:', error)
      },
      (code) => {
        console.warn('Log stream closed with code:', code)
      },
    )

    // Clean up on request abort
    request.signal.addEventListener('abort', () => {
      cleanup()
    })

    return NextResponse.json({
      success: true,
      message: 'Log streaming started via WebSocket',
      service,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start log stream',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Get log history (non-streaming)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { service, lines = 100, since, until, grep } = await request.json()

    const args = []
    if (service) args.push(service)
    args.push(`-n${lines}`)
    if (since) args.push('--since', since)
    if (until) args.push('--until', until)
    if (grep) args.push('--grep', grep)

    const { executeNselfCommand } = await import('@/lib/nselfCLI')
    const result = await executeNselfCommand('logs', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch logs',
          stderr: result.stderr,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: result.stdout?.split('\n').filter(Boolean) || [],
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
