import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { validateServiceName } from '@/lib/validation/service-name'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

/**
 * Known template names accepted by `nself env create --template`.
 * The CLI env.go does not currently advertise a --template flag; this list
 * guards any future expansion of that flag by enforcing an explicit allowlist
 * rather than passing arbitrary user input to execFile.
 */
const KNOWN_TEMPLATES = ['default', 'minimal', 'dev', 'staging', 'prod'] as const

// Tightened pattern: no leading or trailing hyphen, preventing argument-injection
// via values like "--help" or "-rf" being interpreted as CLI flags.
const IDENTIFIER_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

const EnvironmentActionSchema = z.object({
  action: z.enum(['create', 'diff', 'delete', 'list']),
  environment: z
    .string()
    .regex(
      IDENTIFIER_PATTERN,
      'environment must be lowercase alphanumeric with no leading or trailing hyphen'
    )
    .optional(),
  options: z
    .object({
      template: z
        .string()
        .refine(
          (t): t is (typeof KNOWN_TEMPLATES)[number] =>
            (KNOWN_TEMPLATES as readonly string[]).includes(t),
          {
            message: 'template must be one of: ' + KNOWN_TEMPLATES.join(', '),
          }
        )
        .optional(),
      compare: z
        .string()
        .regex(
          IDENTIFIER_PATTERN,
          'compare must be lowercase alphanumeric with no leading or trailing hyphen'
        )
        .optional(),
      force: z.boolean().optional(),
    })
    .optional(),
})

type EnvironmentAction = z.infer<typeof EnvironmentActionSchema>

/** GET is not a mutation — reject to prevent CSRF-style abuse via URL navigation. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const body: unknown = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const parsed = EnvironmentActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const { action, environment, options = {} }: EnvironmentAction = parsed.data

  // Per-action required-field checks after schema validation
  if (action !== 'list' && (!environment || !validateServiceName(environment))) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  if (action === 'diff' && (!options.compare || !validateServiceName(options.compare))) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const projectPath = getProjectPath()
  const sourceIp = extractSourceIp(request.headers)

  // Build argv array — never a shell string.  execFile does not invoke sh.
  // The literal '--' end-of-options separator is inserted before every
  // user-controlled positional so that even a future regex regression cannot
  // cause a value to be interpreted as a CLI flag by the nself arg parser.
  let args: string[]
  switch (action) {
    case 'list':
      args = ['env', 'list']
      break

    case 'create': {
      // Flag arguments (--template) must precede the '--' end-of-options separator.
      // User-controlled positionals come after '--' so they cannot be misinterpreted as flags.
      args = [
        'env',
        'create',
        ...(options.template ? ['--template', options.template] : []),
        '--',
        environment as string,
      ]
      break
    }

    case 'delete':
      args = ['env', 'delete', '--', environment as string]
      if (options.force) {
        args.push('--force')
      }
      break

    case 'diff':
      args = ['env', 'diff', '--', environment as string, options.compare as string]
      break
  }

  try {
    const { stdout, stderr } = await execFileAsync('nself', args, { cwd: projectPath })

    appendAuditFile({
      timestamp: new Date().toISOString(),
      user: 'admin',
      action: `env:${action}`,
      sourceIp,
      method: 'POST',
      path: '/api/deployment/environments',
      after: { environment, options },
      success: true,
    })

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr,
      ...(action === 'list' ? { environments: parseEnvironments(stdout) } : {}),
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }

    appendAuditFile({
      timestamp: new Date().toISOString(),
      user: 'admin',
      action: `env:${action}`,
      sourceIp,
      method: 'POST',
      path: '/api/deployment/environments',
      after: { environment, options },
      success: false,
      details: err.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Environment operation failed',
        details: err.message ?? 'Unknown error',
        stderr: err.stderr,
        stdout: err.stdout,
      },
      { status: 500 }
    )
  }
}

function parseEnvironments(output: string) {
  const environments: Array<{
    name: string
    type: string
    active: boolean
    hasEnv: boolean
    hasSecrets: boolean
  }> = []

  const lines = output.split('\n')
  for (const line of lines) {
    if (line.includes('env:')) {
      const match = line.match(/(\w+)\s+\((.*?)\)/)
      if (match) {
        environments.push({
          name: match[1] ?? '',
          type: match[2] || 'custom',
          active: line.includes('*'),
          hasEnv: line.includes('.env'),
          hasSecrets: line.includes('.env.secrets'),
        })
      }
    }
  }

  return environments
}
