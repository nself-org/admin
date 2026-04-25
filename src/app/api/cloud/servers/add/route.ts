import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

interface AddServerRequest {
  ip: string
  name: string
  user?: string
  port?: number
  sshKey?: string
}

/**
 * POST /api/cloud/servers/add - Add an existing server
 * Executes: nself cloud server add {ip} --name {name}
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const body: AddServerRequest = await request.json()
    const { ip, name, user, port, sshKey } = body
    const projectPath = getProjectPath()

    // Validate required fields
    if (!ip || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'ip and name are required',
        },
        { status: 400 },
      )
    }

    // Build the command
    let command = `nself cloud server add ${ip} --name=${name}`

    if (user) command += ` --user=${user}`
    if (port) command += ` --port=${port}`
    if (sshKey) command += ` --ssh-key=${sshKey}`

    logger.debug('Executing cloud server add', { command, ip, name })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    let server = null

    try {
      const parsed = JSON.parse(stdout.trim())
      server = parsed.server || parsed || null
    } catch (_parseError) {
      // Not JSON, just return raw output
      logger.debug('Server add output is not JSON', { stdout })
    }

    logger.cli(command, true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      message: `Server ${name} (${ip}) has been added`,
      server,
      output: stdout.trim(),
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli('nself cloud server add', false, Date.now() - startTime)
    logger.error('Failed to add server', {
      error: execError.message,
      stderr: execError.stderr,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add server',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
