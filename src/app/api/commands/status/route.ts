import { findNselfPathSync, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceStatus {
  name: string
  state: 'running' | 'stopped' | 'error' | 'unknown'
  uptime?: string
  port?: number
}

interface StatusResponse {
  success: boolean
  output: string
  services: ServiceStatus[]
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse `nself status` output into structured ServiceStatus entries.
 *
 * nself status lines look like:
 *   "  postgres     running  5432  2h 14m"
 *   "  redis        stopped"
 *   "  hasura       error"
 */
function parseStatusOutput(output: string): ServiceStatus[] {
  const services: ServiceStatus[] = []

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    // Attempt to extract service name, state, optional port, optional uptime
    const parts = line.split(/\s+/)
    if (parts.length < 2) continue

    const name = parts[0]
    const rawState = (parts[1] ?? '').toLowerCase()

    let state: ServiceStatus['state'] = 'unknown'
    if (rawState === 'running' || rawState === 'up') state = 'running'
    else if (
      rawState === 'stopped' ||
      rawState === 'down' ||
      rawState === 'exited'
    )
      state = 'stopped'
    else if (rawState === 'error' || rawState === 'unhealthy') state = 'error'

    // Port: first numeric token after state that looks like a port (1–65535)
    let port: number | undefined
    let uptime: string | undefined

    for (const part of parts.slice(2)) {
      const asNum = parseInt(part, 10)
      if (!isNaN(asNum) && asNum > 0 && asNum <= 65535 && port === undefined) {
        port = asNum
      } else if (/^\d+[hmsd]/.test(part)) {
        // Uptime fragment — collect remaining tokens
        const idx = parts.indexOf(part, 2)
        uptime = parts.slice(idx).join(' ')
        break
      }
    }

    services.push({ name, state, port, uptime })
  }

  return services
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const nselfBin = findNselfPathSync()
  const projectPath = getProjectPath()
  const env = { ...process.env, PATH: getEnhancedPath() }

  try {
    const { stdout, stderr } = await execFileAsync(nselfBin, ['status'], {
      cwd: projectPath,
      env,
      timeout: 15_000,
    }).catch((e: { stdout?: string; stderr?: string }) => ({
      stdout: e.stdout || '',
      stderr: e.stderr || '',
    }))

    const output = [stdout, stderr].filter(Boolean).join('\n').trim()
    const services = parseStatusOutput(output)

    return NextResponse.json({
      success: true,
      output,
      services,
    } satisfies StatusResponse)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run nself status',
        details: error instanceof Error ? error.message : 'Unknown error',
        output: '',
        services: [],
      },
      { status: 500 },
    )
  }
}
