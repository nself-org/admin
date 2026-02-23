import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import type { CloudProvider } from '@/types/cloud'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GET /api/cloud/providers - List all 26 cloud providers
 * Executes: nself cloud provider list --json
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const projectPath = getProjectPath()
    const command = 'nself cloud provider list --json'

    logger.debug('Executing cloud provider list', { command, projectPath })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 30000,
    })

    let providers: CloudProvider[] = []

    try {
      const parsed = JSON.parse(stdout.trim())
      providers = parsed.providers || parsed || []
    } catch (_parseError) {
      // If JSON parsing fails, return raw output
      logger.warn('Failed to parse provider list JSON', { stdout })
    }

    logger.cli(command, true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      providers,
      count: providers.length,
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli('nself cloud provider list', false, Date.now() - startTime)
    logger.error('Failed to list cloud providers', {
      error: execError.message,
      stderr: execError.stderr,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list cloud providers',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
