import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

// Strict validation patterns for safe inputs — matches /api/nself/route.ts pattern
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

/**
 * Runs an nself control-plane command via execFile — zero logic reimplementation in TS.
 * All inventory/resolver/probe/capability logic lives entirely in the CLI binary.
 *
 * Note: promisify(execFile) is called at call-time (not module-load) so that
 * Jest can mock 'child_process' and 'util' correctly in tests.
 */
async function runNselfCommand(
  args: string[],
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string }> {
  const execFileAsync = promisify(execFile)
  const projectPath = getProjectPath()
  return execFileAsync('nself', args, {
    cwd: projectPath,
    env: {
      ...process.env,
      PATH: getEnhancedPath(),
      NSELF_PROJECT_PATH: projectPath,
    },
    timeout: timeoutMs,
  })
}

/**
 * GET /api/control-plane
 *
 * Query params:
 *   action=list   (default) — runs `nself env target list --json`
 *   action=probe             — runs `nself env target probe --json`
 *   env=<name>               — optional: scoped to one environment
 *
 * Returns: parsed JSON from CLI stdout, auth not required (read-only).
 * Auth IS required on POST (mutating ops).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') ?? 'list'
    const env = searchParams.get('env')

    const allowedActions = ['list', 'probe']
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      )
    }

    if (env && !validateSafeArg(env)) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment name' },
        { status: 400 }
      )
    }

    // Build args: `nself env target list --json` or `nself env target probe --json`
    const execArgs = ['env', 'target', action, '--json']
    if (env) {
      execArgs.push('--env', env)
    }

    const { stdout, stderr } = await runNselfCommand(execArgs)

    // Parse CLI JSON output — CLI is the source of truth, we relay it verbatim
    let data: unknown
    try {
      data = JSON.parse(stdout.trim())
    } catch {
      // CLI returned non-JSON (e.g. error message) — surface it
      return NextResponse.json(
        {
          success: false,
          error: 'CLI returned non-JSON output',
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      action,
      data,
      stderr: stderr.trim(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const execError = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Control-plane query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? '',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/control-plane
 *
 * Body:
 *   { action: 'add', name: string, host: string, role: string, sshUser?: string, sshKeyPath?: string }
 *   { action: 'remove', name: string }
 *
 * Maps to:
 *   add    → `nself env target add <name> --host <host> --role <role> [--ssh-user <u>] [--ssh-key <k>]`
 *   remove → `nself env target remove <name>`
 *
 * Auth required — mutating ops.
 * NEVER accepts raw SSH key bytes in the body — only file paths.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action } = body

    const allowedActions = ['add', 'remove']
    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Action must be one of: ${allowedActions.join(', ')}` },
        { status: 400 }
      )
    }

    if (action === 'add') {
      const { name, host, role, sshUser, sshKeyPath } = body

      if (!name || !host || !role) {
        return NextResponse.json(
          { success: false, error: 'name, host, and role are required for add' },
          { status: 400 }
        )
      }

      // Validate each arg before forwarding to CLI
      for (const [field, value] of Object.entries({ name, host, role })) {
        if (typeof value !== 'string' || !validateSafeArg(value)) {
          return NextResponse.json(
            { success: false, error: `Invalid value for field: ${field}` },
            { status: 400 }
          )
        }
      }

      // sshKeyPath is a file path — validate but allow forward slashes and dots
      if (sshKeyPath !== undefined) {
        if (typeof sshKeyPath !== 'string' || sshKeyPath.includes('..')) {
          return NextResponse.json({ success: false, error: 'Invalid sshKeyPath' }, { status: 400 })
        }
      }

      if (sshUser !== undefined && (typeof sshUser !== 'string' || !validateSafeArg(sshUser))) {
        return NextResponse.json({ success: false, error: 'Invalid sshUser' }, { status: 400 })
      }

      const execArgs = ['env', 'target', 'add', name, '--host', host, '--role', role]
      if (sshUser) execArgs.push('--ssh-user', sshUser)
      if (sshKeyPath) execArgs.push('--ssh-key', sshKeyPath)

      const { stdout, stderr } = await runNselfCommand(execArgs, 60000)

      return NextResponse.json({
        success: true,
        action: 'add',
        name,
        output: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      })
    }

    if (action === 'remove') {
      const { name } = body

      if (!name || typeof name !== 'string' || !validateSafeArg(name)) {
        return NextResponse.json(
          { success: false, error: 'name is required and must be valid for remove' },
          { status: 400 }
        )
      }

      const execArgs = ['env', 'target', 'remove', name]
      const { stdout, stderr } = await runNselfCommand(execArgs, 30000)

      return NextResponse.json({
        success: true,
        action: 'remove',
        name,
        output: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      })
    }

    // unreachable but TypeScript needs it
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const execError = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Control-plane action failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? '',
      },
      { status: 500 }
    )
  }
}
