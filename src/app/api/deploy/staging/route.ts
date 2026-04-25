import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execFileAsync = promisify(execFile)

// Input validation patterns
const VALID_DOMAIN = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_HOST = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i
const VALID_SERVICE = /^[a-z][a-z0-9_-]*$/i
const VALID_SYNC_TYPE = /^(db|files)$/
const VALID_SECRET_ACTION = /^(show|generate|rotate)$/
const VALID_LINES = /^\d{1,4}$/
const VALID_FILE_PATH = /^[a-zA-Z0-9_\-./]+$/

// Validate input against pattern
function validateInput(
  value: string | undefined,
  pattern: RegExp,
  name: string,
): string | null {
  if (!value) return null
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${name}: contains disallowed characters`)
  }
  return value
}

// GET /api/deploy/staging - Get staging status
export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    if (!nselfPath) {
      return NextResponse.json(
        { success: false, error: 'nself CLI not found' },
        { status: 500 },
      )
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        nselfPath,
        ['staging', 'status'],
        {
          cwd: projectPath,
          env: { ...process.env, PATH: getEnhancedPath() },
          timeout: 30000,
        },
      )

      return NextResponse.json({
        success: true,
        status: stdout.trim(),
        stderr: stderr.trim(),
      })
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string }
      return NextResponse.json({
        success: true,
        status: 'not-configured',
        output: execError.stdout || '',
        stderr: execError.stderr || '',
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get staging status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/deploy/staging - Execute staging commands
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, options = {} } = body
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    if (!nselfPath) {
      return NextResponse.json(
        { success: false, error: 'nself CLI not found' },
        { status: 500 },
      )
    }

    // Build args array safely - no string interpolation
    const args: string[] = ['staging']

    switch (action) {
      case 'init': {
        args.push('init')
        // Validate and add domain
        const domain = validateInput(options.domain, VALID_DOMAIN, 'domain')
        if (!domain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required for init' },
            { status: 400 },
          )
        }
        args.push(domain)
        // Optional validated parameters
        const email = validateInput(options.email, VALID_EMAIL, 'email')
        if (email) {
          args.push('--email', email)
        }
        const server = validateInput(options.server, VALID_HOST, 'server')
        if (server) {
          args.push('--server', server)
        }
        break
      }

      case 'deploy':
        args.push('deploy')
        if (options.dryRun === true) args.push('--dry-run')
        if (options.force === true) args.push('--force')
        break

      case 'reset':
        args.push('reset')
        if (options.data === true) args.push('--data')
        if (options.force === true) args.push('--force')
        break

      case 'seed': {
        args.push('seed')
        const file = validateInput(options.file, VALID_FILE_PATH, 'file')
        if (file) {
          // Additional path traversal check
          if (file.includes('..')) {
            return NextResponse.json(
              { success: false, error: 'Invalid file path' },
              { status: 400 },
            )
          }
          args.push('--file', file)
        }
        break
      }

      case 'sync': {
        args.push('sync')
        const syncType = validateInput(options.type, VALID_SYNC_TYPE, 'type')
        if (syncType) {
          args.push(syncType)
        }
        if (options.force === true) args.push('--force')
        break
      }

      case 'logs': {
        args.push('logs')
        const service = validateInput(options.service, VALID_SERVICE, 'service')
        if (service) {
          args.push(service)
        }
        const lines = validateInput(
          options.lines?.toString(),
          VALID_LINES,
          'lines',
        )
        if (lines) {
          args.push('-n', lines)
        }
        break
      }

      case 'shell': {
        // For shell/ssh, we return the command to run, not execute it
        const service = validateInput(options.service, VALID_SERVICE, 'service')
        return NextResponse.json({
          success: true,
          action: 'shell',
          command: `nself staging shell${service ? ` ${service}` : ''}`,
          message: 'Use this command in your terminal to connect',
        })
      }

      case 'secrets': {
        args.push('secrets')
        const secretAction = validateInput(
          options.secretAction || 'show',
          VALID_SECRET_ACTION,
          'secretAction',
        )
        if (secretAction) {
          args.push(secretAction)
        }
        if (secretAction === 'generate' && options.force === true) {
          args.push('--force')
        }
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }

    const { stdout, stderr } = await execFileAsync(nselfPath, args, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 300000, // 5 minute timeout
    })

    return NextResponse.json({
      success: true,
      action,
      output: stdout.trim(),
      stderr: stderr.trim(),
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Staging action failed',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
