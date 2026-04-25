import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Allowed environments for deployment
const ALLOWED_ENVIRONMENTS = ['staging', 'production', 'development']

// GET /api/deploy - Get deployment status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const environment = searchParams.get('environment')
    const projectPath = getProjectPath()

    // Validate environment if provided
    if (environment && !ALLOWED_ENVIRONMENTS.includes(environment)) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment' },
        { status: 400 },
      )
    }

    // Build args array
    const execArgs = ['deploy', 'status']
    if (environment) {
      execArgs.push(`--env=${environment}`)
    }

    try {
      const { stdout, stderr } = await execFileAsync('nself', execArgs, {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 30000,
      })

      return NextResponse.json({
        success: true,
        status: stdout.trim(),
        stderr: stderr.trim(),
      })
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string }
      return NextResponse.json({
        success: true,
        status: 'not-deployed',
        output: execError.stdout || '',
        stderr: execError.stderr || '',
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get deployment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/deploy - Execute deployment actions
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, environment, options = {} } = body
    const projectPath = getProjectPath()

    // Validate environment if provided
    if (environment && !ALLOWED_ENVIRONMENTS.includes(environment)) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment' },
        { status: 400 },
      )
    }

    const execArgs: string[] = ['deploy']

    switch (action) {
      case 'deploy': {
        if (!environment) {
          return NextResponse.json(
            { success: false, error: 'Environment is required for deploy' },
            { status: 400 },
          )
        }
        // nself deploy staging|prod [options]
        execArgs.push(environment)
        if (options.dryRun) execArgs.push('--dry-run')
        if (options.force) execArgs.push('--force')
        if (options.rolling) execArgs.push('--rolling')
        if (options.skipHealth) execArgs.push('--skip-health')
        if (options.includeFrontends) execArgs.push('--include-frontends')
        if (options.excludeFrontends) execArgs.push('--exclude-frontends')
        break
      }

      case 'check-access': {
        // nself deploy check-access
        execArgs.push('check-access')
        break
      }

      case 'rollback': {
        // nself deploy rollback
        execArgs.push('rollback')
        if (environment) execArgs.push(environment)
        break
      }

      case 'logs': {
        // nself deploy logs
        execArgs.push('logs')
        if (environment) execArgs.push(environment)
        break
      }

      case 'health': {
        // nself deploy health
        execArgs.push('health')
        if (environment) execArgs.push(environment)
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }

    const { stdout, stderr } = await execFileAsync('nself', execArgs, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 300000, // 5 minute timeout for deployments
    })

    return NextResponse.json({
      success: true,
      action,
      environment,
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
        error: 'Deployment action failed',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
