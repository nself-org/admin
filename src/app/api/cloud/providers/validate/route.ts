import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ValidationResult {
  provider: string
  valid: boolean
  message?: string
  error?: string
}

/**
 * POST /api/cloud/providers/validate - Validate provider configuration
 * Executes: nself cloud provider validate --json
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { provider } = body
    const projectPath = getProjectPath()

    // Build command with optional provider filter
    let command = 'nself cloud provider validate --json'
    if (provider) command += ` --provider=${provider}`

    logger.debug('Executing cloud provider validate', { command, provider })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    let results: ValidationResult[] = []

    try {
      const parsed = JSON.parse(stdout.trim())
      results = parsed.results || parsed.validations || [parsed]
    } catch (_parseError) {
      logger.warn('Failed to parse validation JSON', { stdout })
    }

    logger.cli(command, true, Date.now() - startTime)

    const allValid = results.every((r) => r.valid)

    return NextResponse.json({
      success: true,
      valid: allValid,
      results,
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli('nself cloud provider validate', false, Date.now() - startTime)
    logger.error('Failed to validate provider configuration', {
      error: execError.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate provider configuration',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
