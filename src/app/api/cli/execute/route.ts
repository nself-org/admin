import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { z } from 'zod'
import { requireAuth } from '@/lib/require-auth'

const execFileAsync = promisify(execFile)

// Define allowed nself subcommands and their valid arguments
const ALLOWED_NSELF_COMMANDS: Record<
  string,
  { args?: string[]; options?: string[] }
> = {
  // Core lifecycle commands
  init: { options: ['--template', '--force', '--full'] },
  build: { options: ['--clean', '--verbose', '--force', '--debug'] },
  start: {
    args: ['all', 'service'],
    options: ['--detach', '--force-recreate'],
  },
  stop: { args: ['all', 'service'], options: ['--timeout'] },
  restart: { args: ['service'], options: ['--timeout'] },
  status: { options: ['--json', '--verbose', '--watch'] },
  logs: { args: ['service'], options: ['--follow', '--tail', '--since'] },
  // Management commands
  doctor: { options: ['--fix', '--verbose'] },
  backup: { options: ['--output', '--compress', '--database', '--files'] },
  restore: { args: ['file'], options: ['--force'] },
  monitor: { options: ['--enable', '--disable'] },
  urls: { options: ['--format', '--json'] },
  // SSL and trust
  ssl: {
    args: ['action'],
    options: ['--generate', '--trust', '--domain', '--email'],
  },
  trust: { options: ['--install', '--uninstall'] },
  // Environment management
  env: { args: ['action', 'name'], options: ['--file', '--force'] },
  config: { args: ['action'], options: ['--json', '--verbose'] },
  secrets: { args: ['action'], options: ['--env', '--force', '--rotate'] },
  apply: { options: ['--config', '--force', '--dry-run'] },
  export: { options: ['--format', '--output'] },
  // Cleanup commands
  clean: { options: ['--volumes', '--images', '--all', '--force'] },
  reset: { options: ['--force', '--keep-data', '--keep-volumes'] },
  // Service & container management
  service: { args: ['action', 'name'], options: ['--json', '--verbose'] },
  exec: { args: ['service', 'command'], options: ['--user', '--workdir'] },
  scale: { args: ['service', 'replicas'], options: ['--timeout'] },
  // Deployment & infrastructure
  deploy: { args: ['target'], options: ['--dry-run', '--force', '--rolling'] },
  staging: { args: ['action'], options: ['--force', '--seed', '--sync'] },
  prod: { args: ['action'], options: ['--force', '--verbose', '--dry-run'] },
  infra: { args: ['action'], options: ['--json', '--verbose', '--provider'] },
  // Monitoring & health
  health: { args: ['service'], options: ['--all', '--json', '--verbose'] },
  metrics: { args: ['action'], options: ['--json', '--profile', '--verbose'] },
  perf: {
    args: ['action'],
    options: ['--json', '--verbose', '--profile', '--duration'],
  },
  bench: {
    args: ['action'],
    options: ['--json', '--duration', '--connections', '--compare'],
  },
  // Multi-tenancy & auth
  tenant: { args: ['action', 'name'], options: ['--json', '--force'] },
  auth: { args: ['action'], options: ['--json', '--force', '--provider'] },
  // Developer tools
  dev: { args: ['action'], options: ['--verbose', '--watch'] },
  plugin: {
    args: ['action', 'name'],
    options: ['--json', '--force', '--version'],
  },
  completion: { args: ['shell'], options: ['--install'] },
  // Audit & history
  history: { args: ['action'], options: ['--json', '--limit', '--since'] },
  audit: { args: ['action'], options: ['--json', '--verbose', '--fix'] },
  // Update command
  update: { options: ['--check', '--cli', '--admin', '--restart', '--force'] },
  // Info commands
  help: { args: ['command'] },
  version: { options: ['--short', '--json'] },
  // Database commands
  db: { args: ['action'], options: ['--force', '--verbose', '--json'] },
}

// Schema for command validation
const commandSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  options: z.record(z.string(), z.string()).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()

    // Parse the command string or structured command
    let parsedCommand: {
      command: string
      args?: string[]
      options?: Record<string, string>
    }

    if (typeof body.command === 'string') {
      // Reject commands with shell metacharacters before any parsing
      if (/[;&|`$<>\\]/.test(body.command)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid command format: shell metacharacters are not allowed',
          },
          { status: 400 },
        )
      }

      // Parse string command into structured format
      const parts = body.command.trim().split(/\s+/)

      if (parts[0] !== 'nself') {
        return NextResponse.json(
          { success: false, error: 'Only nself commands are allowed' },
          { status: 403 },
        )
      }

      const subcommand = parts[1]
      if (!subcommand || !ALLOWED_NSELF_COMMANDS[subcommand]) {
        return NextResponse.json(
          { success: false, error: `Invalid nself command: ${subcommand}` },
          { status: 403 },
        )
      }

      // Extract args and options from the rest of the command
      const args: string[] = []
      const options: Record<string, string> = {}

      for (let i = 2; i < parts.length; i++) {
        if (parts[i].startsWith('--')) {
          const optName = parts[i]
          const optValue =
            i + 1 < parts.length && !parts[i + 1].startsWith('--')
              ? parts[++i]
              : 'true'
          options[optName] = optValue
        } else if (!parts[i].startsWith('-')) {
          args.push(parts[i])
        }
      }

      parsedCommand = { command: subcommand, args, options }
    } else {
      parsedCommand = commandSchema.parse(body)

      if (!ALLOWED_NSELF_COMMANDS[parsedCommand.command]) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid nself command: ${parsedCommand.command}`,
          },
          { status: 403 },
        )
      }
    }

    const backendPath = getProjectPath()

    try {
      // Build command arguments safely
      const cmdArgs = ['nself', parsedCommand.command]

      // Add validated arguments
      if (parsedCommand.args) {
        const allowedArgs =
          ALLOWED_NSELF_COMMANDS[parsedCommand.command].args || []
        for (const arg of parsedCommand.args) {
          // Validate argument is allowed or matches pattern
          if (
            allowedArgs.includes(arg) ||
            (parsedCommand.command === 'logs' && /^[a-z0-9_-]+$/i.test(arg)) ||
            (parsedCommand.command === 'restore' &&
              /^\/backups\/[a-z0-9_\-.]+$/i.test(arg))
          ) {
            cmdArgs.push(arg)
          } else {
            return NextResponse.json(
              { success: false, error: `Invalid argument: ${arg}` },
              { status: 400 },
            )
          }
        }
      }

      // Add validated options
      if (parsedCommand.options) {
        const allowedOptions =
          ALLOWED_NSELF_COMMANDS[parsedCommand.command].options || []
        for (const [opt, value] of Object.entries(parsedCommand.options)) {
          if (allowedOptions.includes(opt)) {
            cmdArgs.push(opt)
            if (value !== 'true') {
              // Validate option values
              if (opt === '--tail' && !/^\d+$/.test(value)) {
                return NextResponse.json(
                  { success: false, error: 'Invalid tail value' },
                  { status: 400 },
                )
              }
              if (
                opt === '--output' &&
                !/^\/backups\/[a-z0-9_\-.]+$/i.test(value)
              ) {
                return NextResponse.json(
                  { success: false, error: 'Invalid output path' },
                  { status: 400 },
                )
              }
              cmdArgs.push(value)
            }
          } else {
            return NextResponse.json(
              { success: false, error: `Invalid option: ${opt}` },
              { status: 400 },
            )
          }
        }
      }

      // Use execFile for safety - prevents shell injection
      // Pass command and args separately, use cwd option instead of cd
      const { stdout, stderr } = await execFileAsync(
        cmdArgs[0], // 'nself'
        cmdArgs.slice(1), // remaining args
        {
          cwd: backendPath,
          env: {
            ...process.env,
            PATH: getEnhancedPath(),
            FORCE_COLOR: '0',
          },
          timeout: 300000,
        },
      )

      return NextResponse.json({
        success: true,
        output: stdout || stderr || 'Command executed successfully',
        stdout,
        stderr,
      })
    } catch (execError) {
      // Command failed but we still want to return the output
      const execErr = execError as {
        message?: string
        stdout?: string
        stderr?: string
      }
      return NextResponse.json({
        success: false,
        error: execErr.message,
        output: execErr.stdout || execErr.stderr || execErr.message,
        stdout: execErr.stdout,
        stderr: execErr.stderr,
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute command',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
