import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_ARG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-.:=/]*$/

function validateSafeArg(input: string): boolean {
  return (
    SAFE_ARG_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.includes('&&') &&
    !input.includes('||') &&
    !input.includes(';') &&
    !input.includes('`') &&
    !input.includes('$(') &&
    !input.includes('|')
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { command, args = [] } = await request.json()

    if (!command) {
      return NextResponse.json(
        { success: false, error: 'Command is required' },
        { status: 400 },
      )
    }

    // Validate allowed commands for security
    const allowedCommands = [
      'status',
      'doctor',
      'urls',
      'help',
      'version',
      'start',
      'stop',
      'restart',
      'logs',
      'ps',
      'build',
      'down',
      'up',
      'pull',
      'info',
      'init',
    ]

    if (!allowedCommands.includes(command)) {
      return NextResponse.json(
        { success: false, error: `Command '${command}' not allowed` },
        { status: 403 },
      )
    }

    // Validate args is an array
    if (!Array.isArray(args)) {
      return NextResponse.json(
        { success: false, error: 'Args must be an array' },
        { status: 400 },
      )
    }

    // Validate each argument
    const validatedArgs: string[] = []
    for (const arg of args) {
      if (typeof arg !== 'string') {
        return NextResponse.json(
          { success: false, error: 'All arguments must be strings' },
          { status: 400 },
        )
      }
      if (arg.length > 0 && !validateSafeArg(arg)) {
        return NextResponse.json(
          { success: false, error: `Invalid argument: ${arg}` },
          { status: 400 },
        )
      }
      if (arg.length > 0) {
        validatedArgs.push(arg)
      }
    }

    // Execute nself command in the project directory using centralized resolution
    const projectPath = getProjectPath()
    const execArgs = [command, ...validatedArgs]

    const { stdout, stderr } = await execFileAsync('nself', execArgs, {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
        // Ensure nself runs in the correct context
        NSELF_PROJECT_PATH: projectPath,
      },
      timeout: 30000, // 30 second timeout
    })

    return NextResponse.json({
      success: true,
      data: {
        command: `nself ${command} ${validatedArgs.join(' ')}`,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      },
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
        error: 'Failed to execute nself command',
        details: error instanceof Error ? error.message : 'Unknown error',
        stderr: execError.stderr || '',
        stdout: execError.stdout || '',
      },
      { status: 500 },
    )
  }
}

// GET endpoint for common status queries
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'

  // Validate action against allowlist
  const allowedActions = ['status', 'urls', 'doctor', 'version', 'help']
  if (!allowedActions.includes(action)) {
    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()

    const { stdout, stderr } = await execFileAsync('nself', [action], {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
        NSELF_PROJECT_PATH: projectPath,
      },
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      data: {
        action,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get ${action} data`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
