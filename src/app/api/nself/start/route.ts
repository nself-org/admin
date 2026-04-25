import { nselfStart, nselfStatus } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const _projectPath = getProjectPath()

    // Run nself start using secure CLI wrapper
    const result = await nselfStart()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Start command failed',
          details: result.stderr || result.error || 'Unknown error',
          output: {
            stdout: result.stdout ? result.stdout.split('\n') : [],
            stderr: result.stderr ? result.stderr.split('\n') : [],
          },
          suggestions: [
            'Check if Docker is running',
            'Ensure no other services are using required ports',
            'Run nself doctor to diagnose issues',
            'Check project configuration in .env.local',
          ],
        },
        { status: 500 },
      )
    }

    const stdout = result.stdout || ''
    const stderr = result.stderr || ''

    // Parse the output to extract service information
    const lines = stdout.split('\n').filter((line) => line.trim())
    const services: any[] = []
    const urls: string[] = []

    lines.forEach((line) => {
      // Look for service status lines
      if (
        line.includes('✓') &&
        (line.includes('started') || line.includes('running'))
      ) {
        const serviceName = line.match(/✓\s+(\w+)/)?.[1]
        if (serviceName) {
          services.push({
            name: serviceName,
            status: 'running',
            message: line.trim(),
          })
        }
      }

      // Look for URL lines
      if (
        line.includes('http') &&
        (line.includes('://') || line.includes('local.nself.org'))
      ) {
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/)
        if (urlMatch) {
          urls.push(urlMatch[1])
        }
      }
    })

    // Additional service status check using secure CLI wrapper
    try {
      const statusResult = await nselfStatus()

      if (statusResult.success && statusResult.stdout) {
        // Parse status output for more detailed service info
        const statusLines = statusResult.stdout
          .split('\n')
          .filter((line) => line.trim())
        statusLines.forEach((line: string) => {
          if (line.includes('running') || line.includes('healthy')) {
            const parts = line.split(/\s+/)
            if (parts.length > 1) {
              const serviceName = parts[0]
              const status = line.includes('healthy') ? 'healthy' : 'running'

              // Update existing service or add new one
              const existingService = services.find(
                (s: any) => s.name === serviceName,
              )
              if (existingService) {
                existingService.status = status
              } else {
                services.push({
                  name: serviceName,
                  status: status,
                  message: line.trim(),
                })
              }
            }
          }
        })
      }
    } catch (statusError) {
      const statusErr =
        statusError instanceof Error
          ? statusError
          : new Error(String(statusError))
      console.warn('Could not get detailed status:', statusErr.message)
    }

    return NextResponse.json({
      success: true,
      message: 'All services started successfully',
      services,
      urls,
      output: {
        stdout: lines,
        stderr: stderr ? stderr.split('\n').filter((line) => line.trim()) : [],
      },
    })
  } catch (error) {
    console.error('nself start error:', error)

    // Parse error output for user-friendly messages
    const errorMessage = error instanceof Error ? error.message : 'Start failed'
    const isTimeout = errorMessage.includes('timeout')
    const isPortConflict =
      errorMessage.includes('port') && errorMessage.includes('already')
    const isMissingDependency =
      errorMessage.includes('command not found') ||
      errorMessage.includes('nself')

    let userMessage = 'Failed to start services due to unknown error'
    if (isTimeout) {
      userMessage =
        'Start timed out - services may be taking longer than expected to initialize'
    } else if (isPortConflict) {
      userMessage =
        'Port conflict detected - some required ports may already be in use'
    } else if (isMissingDependency) {
      userMessage = 'nself CLI not found - please ensure nself is installed'
    } else {
      userMessage = 'Failed to start services. Check server logs for details.'
    }

    console.error('nself start error:', error)
    return NextResponse.json(
      {
        success: false,
        message: userMessage,
        error: 'Start failed. Check server logs for details.',
        suggestions: [
          'Check if Docker is running',
          'Ensure no other services are using required ports',
          'Run nself doctor to diagnose issues',
          'Check project configuration in .env.local',
        ],
      },
      { status: 500 },
    )
  }
}
