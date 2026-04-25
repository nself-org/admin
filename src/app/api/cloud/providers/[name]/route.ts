import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import type { CloudProvider } from '@/types/cloud'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * GET /api/cloud/providers/[name] - Get provider details
 * Executes: nself cloud provider info {name} --json
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await params

  try {
    const projectPath = getProjectPath()
    const command = `nself cloud provider info ${name} --json`

    logger.debug('Executing cloud provider info', { command, provider: name })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 30000,
    })

    let provider: CloudProvider | null = null

    try {
      const parsed = JSON.parse(stdout.trim())
      provider = parsed.provider || parsed || null
    } catch (_parseError) {
      logger.warn('Failed to parse provider info JSON', { stdout })
    }

    logger.cli(command, true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      provider,
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli(
      `nself cloud provider info ${name}`,
      false,
      Date.now() - startTime,
    )
    logger.error('Failed to get provider info', {
      provider: name,
      error: execError.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: `Failed to get provider info for ${name}`,
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/cloud/providers/[name] - Configure provider credentials
 * Executes: nself cloud provider init {name} with credentials
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  const { name } = await params

  try {
    const body = await request.json()
    const { credentials, defaultRegion, defaultSize } = body
    const projectPath = getProjectPath()

    // Build the command with optional flags
    let command = `nself cloud provider init ${name}`
    if (defaultRegion) command += ` --region=${defaultRegion}`
    if (defaultSize) command += ` --size=${defaultSize}`

    // Pass credentials via environment variables for security
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: getEnhancedPath(),
    }

    // Map provider-specific credentials to environment variables
    if (credentials) {
      Object.entries(credentials).forEach(([key, value]) => {
        env[`NSELF_CLOUD_${key.toUpperCase()}`] = String(value)
      })
    }

    logger.debug('Executing cloud provider init', { command, provider: name })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env,
      timeout: 60000,
    })

    logger.cli(command, true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      provider: name,
      message: `Provider ${name} configured successfully`,
      output: stdout.trim(),
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli(
      `nself cloud provider init ${name}`,
      false,
      Date.now() - startTime,
    )
    logger.error('Failed to configure provider', {
      provider: name,
      error: execError.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: `Failed to configure provider ${name}`,
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
