import { execFile, spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Valid container ID pattern (Docker container IDs are hex strings or names)
const VALID_CONTAINER_ID = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
const VALID_TAIL = /^\d{1,5}$/
// eslint-disable-next-line security/detect-unsafe-regex
const VALID_SINCE =
  /^(\d+[smhd]?|\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?)?)$/

function validateContainerId(id: string | null): string | null {
  if (!id) return null
  // Container IDs can be short (first 12 chars) or full (64 chars) hex, or names
  if (id.length > 64 || !VALID_CONTAINER_ID.test(id)) {
    return null
  }
  return id
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const containerIdRaw = searchParams.get('container')
    const tailRaw = searchParams.get('tail') || '100'
    const sinceRaw = searchParams.get('since') || ''
    const follow = searchParams.get('follow') === 'true'

    // Validate container ID
    const containerId = validateContainerId(containerIdRaw)
    if (!containerId) {
      return NextResponse.json(
        { error: 'Invalid or missing container ID' },
        { status: 400 },
      )
    }

    // Validate tail parameter
    if (!VALID_TAIL.test(tailRaw)) {
      return NextResponse.json(
        { error: 'Invalid tail parameter' },
        { status: 400 },
      )
    }
    const tail = tailRaw

    // Validate since parameter if provided
    let since = ''
    if (sinceRaw && VALID_SINCE.test(sinceRaw)) {
      since = sinceRaw
    }

    if (follow) {
      // For streaming logs, use spawn with array arguments (safe)
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const args = [
            'logs',
            containerId,
            '--tail',
            tail,
            '--follow',
            '--timestamps',
          ]

          const dockerLogs = spawn('docker', args)

          dockerLogs.stdout.on('data', (data) => {
            const message = `data: ${JSON.stringify({
              type: 'stdout',
              message: data.toString(),
              timestamp: new Date().toISOString(),
            })}\n\n`
            controller.enqueue(encoder.encode(message))
          })

          dockerLogs.stderr.on('data', (data) => {
            const message = `data: ${JSON.stringify({
              type: 'stderr',
              message: data.toString(),
              timestamp: new Date().toISOString(),
            })}\n\n`
            controller.enqueue(encoder.encode(message))
          })

          dockerLogs.on('error', (error) => {
            const message = `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            })}\n\n`
            controller.enqueue(encoder.encode(message))
            controller.close()
          })

          dockerLogs.on('close', () => {
            controller.close()
          })

          // Clean up on disconnect
          request.signal.addEventListener('abort', () => {
            dockerLogs.kill()
            controller.close()
          })
        },
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } else {
      // Non-streaming logs using execFile (safe - array arguments)
      const args = ['logs', containerId, '--tail', tail]
      if (since) {
        args.push('--since', since)
      }

      const { stdout, stderr } = await execFileAsync('docker', args)

      return NextResponse.json({
        success: true,
        logs: {
          stdout: stdout.split('\n').filter(Boolean),
          stderr: stderr.split('\n').filter(Boolean),
        },
        container: containerId,
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch container logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Clear logs (requires write access to Docker)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const containerIdRaw = searchParams.get('container')

    // Validate container ID
    const containerId = validateContainerId(containerIdRaw)
    if (!containerId) {
      return NextResponse.json(
        { error: 'Invalid or missing container ID' },
        { status: 400 },
      )
    }

    // Get log path using execFile with array arguments (safe)
    const { stdout } = await execFileAsync('docker', [
      'inspect',
      containerId,
      '--format={{.LogPath}}',
    ])
    const logPath = stdout.trim()

    if (logPath && logPath !== '') {
      // Validate log path - must be under /var/lib/docker or similar
      // and must not contain path traversal attempts
      if (
        logPath.includes('..') ||
        (!logPath.startsWith('/var/lib/docker/') &&
          !logPath.startsWith('/var/run/docker/'))
      ) {
        return NextResponse.json(
          { error: 'Invalid log path detected' },
          { status: 400 },
        )
      }

      // Use execFile with truncate (safe - validated path)
      await execFileAsync('truncate', ['-s', '0', logPath])

      return NextResponse.json({
        success: true,
        message: 'Container logs cleared',
        container: containerId,
      })
    } else {
      return NextResponse.json(
        { error: 'Could not find log path for container' },
        { status: 404 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to clear container logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
