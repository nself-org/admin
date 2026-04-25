import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import type { CloudServer } from '@/types/cloud'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/

function validateSafeName(input: string): boolean {
  return SAFE_NAME_PATTERN.test(input) && !input.includes('..')
}

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * GET /api/cloud/servers/[name] - Get server status
 * Executes: nself cloud server status {name} --json
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await params

  // Validate name parameter
  if (!validateSafeName(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid server name' },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()

    logger.debug('Executing cloud server status', { server: name })

    const { stdout, stderr } = await execFileAsync(
      'nself',
      ['cloud', 'server', 'status', name, '--json'],
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 30000,
      },
    )

    let server: CloudServer | null = null

    try {
      const parsed = JSON.parse(stdout.trim())
      server = parsed.server || parsed || null
    } catch (_parseError) {
      logger.warn('Failed to parse server status JSON', { stdout })
    }

    logger.cli(
      `nself cloud server status ${name} --json`,
      true,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      server,
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli(
      `nself cloud server status ${name}`,
      false,
      Date.now() - startTime,
    )
    logger.error('Failed to get server status', {
      server: name,
      error: execError.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: `Failed to get status for server ${name}`,
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/cloud/servers/[name] - Destroy server
 * Executes: nself cloud server destroy {name}
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  const { name } = await params

  // Validate name parameter
  if (!validateSafeName(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid server name' },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()

    logger.debug('Executing cloud server destroy', { server: name })

    const { stdout, stderr } = await execFileAsync(
      'nself',
      ['cloud', 'server', 'destroy', name, '--yes'],
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000, // 2 minute timeout for destruction
      },
    )

    logger.cli(
      `nself cloud server destroy ${name} --yes`,
      true,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      message: `Server ${name} has been destroyed`,
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
      `nself cloud server destroy ${name}`,
      false,
      Date.now() - startTime,
    )
    logger.error('Failed to destroy server', {
      server: name,
      error: execError.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: `Failed to destroy server ${name}`,
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
