import { findNselfPathSync, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

import type {
  RunCommandRequest,
  RunCommandResult,
} from '@/features/commands/types'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Security — allowlist and validation
// ---------------------------------------------------------------------------

/** Commands permitted to be executed through the run endpoint. */
const ALLOWED_COMMANDS = new Set([
  'start',
  'stop',
  'restart',
  'status',
  'logs',
  'build',
  'deploy',
  'plugin',
  'env',
  'doctor',
  'backup',
  'tenant',
  'update',
  'config',
  'ssl',
  'db',
  'monitor',
  'clean',
  'scale',
  'webhooks',
  'alerts',
  'secrets',
])

/** Commands that may take significantly longer to complete. */
const LONG_RUNNING_COMMANDS = new Set(['build', 'deploy', 'backup'])

const LONG_TIMEOUT_MS = 300_000
const DEFAULT_TIMEOUT_MS = 30_000

/** Valid flag name pattern: must start with one or two dashes followed by a letter. */
const FLAG_NAME_PATTERN = /^--?[a-z][a-z0-9-]*$/

/**
 * Validate that a flag name is safe to pass to execFile.
 * Rejects anything that could be shell injection or path traversal.
 */
function isValidFlagName(name: string): boolean {
  return FLAG_NAME_PATTERN.test(name)
}

/**
 * Validate that a flag value is safe.
 * Rejects null/undefined; accepts empty string for boolean-style flags.
 */
function isValidFlagValue(value: unknown): value is string | boolean {
  return typeof value === 'string' || typeof value === 'boolean'
}

// ---------------------------------------------------------------------------
// Argument builder
// ---------------------------------------------------------------------------

/**
 * Convert a flags record into a flat array of CLI args suitable for execFile.
 * Boolean true flags become "--flagname". String/int flags become "--flagname" "value".
 * False booleans are omitted.
 */
function buildFlagArgs(flags: Record<string, string | boolean>): string[] {
  const args: string[] = []

  for (const [rawName, value] of Object.entries(flags)) {
    // Normalize: strip leading dashes (UI may send "env" or "--env")
    const stripped = rawName.replace(/^-+/, '')
    const flagArg = `--${stripped}`

    if (!isValidFlagName(flagArg)) continue
    if (!isValidFlagValue(value)) continue

    if (typeof value === 'boolean') {
      if (value) args.push(flagArg)
      continue
    }

    // String value — skip empty
    if (value.trim() === '') continue
    args.push(flagArg, value)
  }

  return args
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let body: RunCommandRequest
  try {
    body = (await request.json()) as RunCommandRequest
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { command, subcommand, flags = {}, projectPath: reqPath } = body

  // 1. Command must be a non-empty string
  if (!command || typeof command !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing required field: command' },
      { status: 400 },
    )
  }

  // 2. Allowlist check — reject unknown commands with 403
  if (!ALLOWED_COMMANDS.has(command)) {
    return NextResponse.json(
      { success: false, error: `Command not permitted: ${command}` },
      { status: 403 },
    )
  }

  // 3. Validate flag names
  for (const rawName of Object.keys(flags)) {
    const stripped = rawName.replace(/^-+/, '')
    const flagArg = `--${stripped}`
    if (!isValidFlagName(flagArg)) {
      return NextResponse.json(
        { success: false, error: `Invalid flag name: ${rawName}` },
        { status: 400 },
      )
    }
  }

  // 4. Validate subcommand tokens if provided (alphanumeric + hyphens only)
  if (subcommand !== undefined && subcommand !== null) {
    if (typeof subcommand !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid subcommand type' },
        { status: 400 },
      )
    }
    const subTokens = subcommand.split(/\s+/).filter(Boolean)
    for (const token of subTokens) {
      if (!/^[a-z][a-z0-9-]*$/.test(token)) {
        return NextResponse.json(
          { success: false, error: `Invalid subcommand token: ${token}` },
          { status: 400 },
        )
      }
    }
  }

  // 5. Build the args array — never use shell string concatenation
  const args: string[] = [command]

  if (subcommand) {
    const subTokens = subcommand.split(/\s+/).filter(Boolean)
    args.push(...subTokens)
  }

  const flagArgs = buildFlagArgs(flags)
  args.push(...flagArgs)

  // 6. Resolve project path
  const cwd = reqPath ?? getProjectPath()

  // 7. Resolve timeout
  const timeoutMs = LONG_RUNNING_COMMANDS.has(command)
    ? LONG_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS

  // 8. Execute
  const nselfBin = findNselfPathSync()
  const env = { ...process.env, PATH: getEnhancedPath() }
  const startedAt = Date.now()

  let result: RunCommandResult
  try {
    const { stdout, stderr } = await execFileAsync(nselfBin, args, {
      cwd,
      env,
      timeout: timeoutMs,
    })

    const duration = Date.now() - startedAt
    const output = [stdout, stderr].filter(Boolean).join('\n').trim()

    result = { success: true, output, exitCode: 0, duration }
  } catch (err) {
    const duration = Date.now() - startedAt
    const execError = err as {
      message?: string
      stdout?: string
      stderr?: string
      code?: number | string
      signal?: string
    }

    const exitCode = typeof execError.code === 'number' ? execError.code : 1
    const output = [execError.stdout, execError.stderr, execError.message]
      .filter(Boolean)
      .join('\n')
      .trim()

    // Timeout
    if (execError.signal === 'SIGTERM') {
      return NextResponse.json(
        {
          success: false,
          error: `Command timed out after ${timeoutMs / 1000}s`,
          output,
          exitCode: 124,
          duration,
        } satisfies Partial<RunCommandResult> & { error: string },
        { status: 504 },
      )
    }

    result = { success: false, output, exitCode, duration }
  }

  return NextResponse.json(result, { status: result.success ? 200 : 422 })
}
