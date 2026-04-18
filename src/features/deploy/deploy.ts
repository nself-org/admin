/**
 * Server-side deploy module.
 * Shells out to `nself deploy` via execFile — no string interpolation in args.
 * Import only from API routes (server-side only).
 */

import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type {
  DeployConfig,
  DeployError,
  DeployResult,
  DeployStep,
  DeployTarget,
} from './types'

const execFileAsync = promisify(execFile)

/** Map DeployTarget → CLI token (prod uses 'production' in the CLI). */
const TARGET_CLI_TOKEN: Record<DeployTarget, string> = {
  local: 'local',
  staging: 'staging',
  prod: 'production',
}

// ---------------------------------------------------------------------------
// Output → steps parser
// ---------------------------------------------------------------------------

/**
 * Parse CLI stdout into DeployStep list.
 * Recognises lines like "  [done] Build images" and "  [failed] Health check".
 * Falls back to a single synthetic step when no structured lines are detected.
 */
function parseSteps(output: string, success: boolean): DeployStep[] {
  const lines = output.split('\n').filter((l) => l.trim().length > 0)

  const STEP_PATTERN = /^\s*\[(done|failed|skipped|running|pending)\]\s+(.+)$/i
  const structured = lines.filter((l) => STEP_PATTERN.test(l))

  if (structured.length === 0) {
    // No structured lines — treat entire output as one step
    return [
      {
        name: 'Deploy',
        status: success ? 'done' : 'failed',
        output: output.trim() || undefined,
      },
    ]
  }

  return structured.map((line): DeployStep => {
    const match = STEP_PATTERN.exec(line)
    if (!match) {
      return { name: line.trim(), status: 'done' }
    }
    const rawStatus = match[1].toLowerCase() as DeployStep['status']
    return {
      name: match[2].trim(),
      status: rawStatus,
    }
  })
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run a deploy via the nself CLI.
 *
 * CLI commands:
 *   rolling:    nself deploy <target>
 *   blue-green: nself deploy <target> --strategy=blue-green
 *   canary:     nself deploy <target> --strategy=canary
 *   preview:    nself deploy <target> --strategy=preview
 *
 * @throws DeployError with typed code on failure
 */
export async function runDeploy(config: DeployConfig): Promise<DeployResult> {
  const nselfPath = await findNselfPath()

  if (!nselfPath) {
    const err = new Error('nself CLI not found') as DeployError
    err.code = 'CLI_NOT_FOUND'
    throw err
  }

  const projectPath = config.projectPath ?? getProjectPath()
  const cliTarget = TARGET_CLI_TOKEN[config.target]
  const timeout = config.dryRun === true ? 30_000 : 120_000

  // Build args safely — no string interpolation / no shell injection surface
  const args: string[] = ['deploy', cliTarget]

  if (config.strategy !== 'rolling') {
    args.push(`--strategy=${config.strategy}`)
  }

  if (config.dryRun === true) {
    args.push('--dry-run')
  }

  const startedAt = Date.now()

  try {
    const { stdout, stderr } = await execFileAsync(nselfPath, args, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout,
    })

    const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
    const duration = Date.now() - startedAt
    const steps = parseSteps(output, true)

    return {
      success: true,
      target: config.target,
      strategy: config.strategy,
      steps,
      duration,
      output,
    }
  } catch (execErr) {
    const typedErr = execErr as {
      message?: string
      stdout?: string
      stderr?: string
      killed?: boolean
    }

    const duration = Date.now() - startedAt
    const output = [typedErr.stdout?.trim(), typedErr.stderr?.trim()]
      .filter(Boolean)
      .join('\n')
    const steps = parseSteps(output, false)

    const message = typedErr.message ?? 'Deploy failed'

    // Classify the error
    let code: DeployError['code'] = 'DEPLOY_FAILED'
    if (message.toLowerCase().includes('not found')) {
      code = 'CLI_NOT_FOUND'
    } else if (message.toLowerCase().includes('unauthorized')) {
      code = 'UNAUTHORIZED'
    } else if (
      message.toLowerCase().includes('invalid') &&
      message.toLowerCase().includes('target')
    ) {
      code = 'INVALID_TARGET'
    }

    const deployError = new Error(message) as DeployError
    deployError.code = code
    deployError.details = output || undefined

    // Return a failed DeployResult (callers may also catch and read deployError)
    const result: DeployResult = {
      success: false,
      target: config.target,
      strategy: config.strategy,
      steps,
      duration,
      output,
      error: message,
    }

    // Rethrow so API routes can handle it
    Object.assign(deployError, { result })
    throw deployError
  }
}
