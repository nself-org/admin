import { VERSION } from '@/lib/constants'
import type { DependencyCheck, OutboundStatus } from '@/lib/health-dependencies'
import { checkHasura, checkOutbound, checkPostgres } from '@/lib/health-dependencies'
import { checkMemory, formatUptime, getCpuUsage, getMemoryUsage } from '@/lib/health-system'
import { getEnhancedPath } from '@/lib/nself-path'
import { exec } from 'child_process'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  cliVersion?: string
  uptime: number
  uptimeFormatted: string
  checks: {
    docker: boolean
    filesystem: boolean
    memory: boolean
    postgres: boolean
    hasura: boolean
    nself: boolean
  }
  /** Per-dependency probe detail (reachability, or why a probe was skipped). */
  dependencies: {
    postgres: DependencyCheck
    hasura: DependencyCheck
  }
  /**
   * Outbound internet reachability. Informational ONLY — never folded into
   * `status`. nSelf supports offline / air-gapped operation, so an install with
   * no internet is healthy, not degraded. 'not-checked' unless the operator
   * sets NSELF_ADMIN_HEALTH_OUTBOUND_URL.
   */
  outbound: OutboundStatus
  resources: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
  }
}

async function checkDocker(): Promise<boolean> {
  try {
    await execAsync('docker version')
    return true
  } catch {
    return false
  }
}

async function checkNselfCli(): Promise<{
  available: boolean
  version?: string
}> {
  // Helper to extract version from output
  const extractVersion = (stdout: string): string | undefined => {
    const versionMatch = stdout.match(/v?(\d+\.\d+\.\d+)/)
    return versionMatch ? versionMatch[1] : stdout.trim() || undefined
  }

  // First try: Use nself command directly (works on host)
  try {
    const { stdout } = await execAsync('nself -v', {
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 5000,
    })
    const version = extractVersion(stdout)
    if (version) {
      return { available: true, version }
    }
  } catch {
    // Fall through to try direct path
  }

  // Second try: Use full path to nself.sh (for Docker container)
  // This fixes BASH_SOURCE resolution issue when called via Node.js exec()
  try {
    const { stdout } = await execAsync('/opt/nself/src/cli/nself.sh -v', {
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 5000,
    })
    const version = extractVersion(stdout)
    if (version) {
      return { available: true, version }
    }
  } catch {
    // Fall through
  }

  return { available: false }
}

async function checkFilesystem(): Promise<boolean> {
  try {
    // Check if we can write to /tmp
    const testFile = '/tmp/.health-check'
    await fs.writeFile(testFile, 'test')
    await fs.unlink(testFile)

    // Check if project directory is accessible (mounted at /workspace in container)
    const projectPath = process.env.NSELF_PROJECT_PATH || '/workspace'
    await fs.access(projectPath, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latencyMs?: number
  message?: string
}

interface HealthData {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealth[]
  checkedAt: string
}

function checksToServiceHealthList(
  checks: Record<string, boolean>,
  latencyMs: number
): ServiceHealth[] {
  const labelMap: Record<string, string> = {
    docker: 'Docker',
    filesystem: 'Filesystem',
    memory: 'Memory',
    postgres: 'PostgreSQL',
    hasura: 'Hasura',
    nself: 'nSelf CLI',
  }
  return Object.entries(checks).map(([key, ok]) => ({
    name: labelMap[key] ?? key,
    status: ok ? 'healthy' : 'unhealthy',
    latencyMs,
  }))
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'

  try {
    const startTime = process.hrtime()

    // Run all checks in parallel.
    // `outbound` is deliberately NOT part of `checks`: it is informational and
    // must never influence `status` (see HealthStatus.outbound).
    const [
      dockerOk,
      filesystemOk,
      memoryOk,
      postgresCheck,
      hasuraCheck,
      outbound,
      nselfCheck,
      memoryUsage,
      cpuUsage,
    ] = await Promise.all([
      checkDocker(),
      checkFilesystem(),
      checkMemory(),
      checkPostgres(),
      checkHasura(),
      checkOutbound(),
      checkNselfCli(),
      getMemoryUsage(),
      getCpuUsage(),
    ])

    const checks = {
      docker: dockerOk,
      filesystem: filesystemOk,
      memory: memoryOk,
      postgres: postgresCheck.ok,
      hasura: hasuraCheck.ok,
      nself: nselfCheck.available,
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = Object.values(checks).some(
      (check) => check === false
    )
      ? 'degraded'
      : 'healthy'

    // Critical checks that make the service unhealthy
    if (!dockerOk || !filesystemOk) {
      status = 'unhealthy'
    }

    const [, elapsed] = process.hrtime(startTime)
    const responseTime = Math.round(elapsed / 1000000) // Convert to milliseconds

    // ?all=true — return HealthData shape expected by the health dashboard UI
    if (all) {
      const healthData: HealthData = {
        overall: status,
        services: checksToServiceHealthList(checks, responseTime),
        checkedAt: new Date().toISOString(),
      }
      return NextResponse.json(healthData, {
        headers: {
          'X-Response-Time': `${responseTime}ms`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const uptimeSeconds = process.uptime()
    const health: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: VERSION,
      cliVersion: nselfCheck.version,
      uptime: uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
      checks,
      dependencies: {
        postgres: postgresCheck,
        hasura: hasuraCheck,
      },
      outbound,
      resources: {
        memory: memoryUsage,
        cpu: {
          usage: cpuUsage,
        },
      },
    }

    return NextResponse.json(health, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: unknown) {
    // On fatal error, always return a safe shape
    if (all) {
      const errData: HealthData = {
        overall: 'unhealthy',
        services: [],
        checkedAt: new Date().toISOString(),
      }
      return NextResponse.json(errData, { status: 503 })
    }
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: {
          docker: false,
          filesystem: false,
          memory: false,
          postgres: false,
          hasura: false,
          nself: false,
        },
      },
      { status: 503 }
    )
  }
}

// Readiness check - lighter weight than health check
export async function HEAD() {
  try {
    // Just check if Docker is accessible
    const dockerOk = await checkDocker()

    if (dockerOk) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
