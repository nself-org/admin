import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import type { CloudServer } from '@/types/cloud'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GET /api/cloud/servers - List all servers
 * Executes: nself cloud server list --json
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const projectPath = getProjectPath()

    // Build command with optional provider filter
    let command = 'nself cloud server list --json'
    if (provider) command += ` --provider=${provider}`

    logger.debug('Executing cloud server list', { command, provider })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    let servers: CloudServer[] = []

    try {
      const parsed = JSON.parse(stdout.trim())
      servers = parsed.servers || parsed || []
    } catch (_parseError) {
      logger.warn('Failed to parse server list JSON', { stdout })
    }

    logger.cli(command, true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      servers,
      count: servers.length,
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli('nself cloud server list', false, Date.now() - startTime)
    logger.error('Failed to list cloud servers', {
      error: execError.message,
      stderr: execError.stderr,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list cloud servers',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
