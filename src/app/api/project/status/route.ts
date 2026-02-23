import { hasAdminPassword as checkAdminPassword } from '@/lib/database'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Module-level response cache — avoids repeated expensive shell commands when
// multiple callers hit this endpoint concurrently (e.g., login routing-logic +
// page mount hooks fired by /build and /dashboard on every test navigation).
// TTL is intentionally long: project state changes slowly, and tests need
// sub-second responses after globalSetup warms the cache.
type StatusPayload = Record<string, unknown>
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let _cache: { payload: StatusPayload; expiresAt: number } | null = null
// In-flight deduplication: concurrent requests await the same promise instead
// of each spawning duplicate shell commands.
let _inFlight: Promise<StatusPayload> | null = null

// Strip ANSI escape codes from terminal output
function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}

async function computeStatus(): Promise<StatusPayload> {
  const projectPath = getProjectPath()

  // Check if any env file exists - nself prefers .env, falls back to .env.dev
  let hasEnvFile = false
  let envContent = ''
  let projectNameFromEnv: string | null = null

  // Check in nself's priority order - but combine content to get all config
  const envFiles = [
    '.env',
    '.env.local',
    '.env.dev',
    '.env.staging',
    '.env.prod',
  ]
  for (const envFile of envFiles) {
    const envPath = path.join(projectPath, envFile)
    try {
      const content = await fs.readFile(envPath, 'utf8')
      hasEnvFile = true
      // Combine all env content for full configuration detection
      envContent += '\n' + content
      // Extract PROJECT_NAME from first file that has it
      if (!projectNameFromEnv) {
        const match = content.match(/PROJECT_NAME=(.+)/)
        if (match) {
          projectNameFromEnv = match[1].trim().replace(/["']/g, '')
        }
      }
    } catch {
      // File doesn't exist, try next
    }
  }

  // Check if docker-compose.yml exists (project is built)
  const dockerComposePath = path.join(projectPath, 'docker-compose.yml')
  let isBuilt = false
  try {
    await fs.access(dockerComposePath)
    isBuilt = true
  } catch {
    isBuilt = false
  }

  // Check if services are running
  let servicesRunning = false
  let runningServices: any[] = []

  // First try nself status command — 3 s timeout (fail fast if not installed)
  try {
    const { stdout } = await execAsync('nself status', {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
        NSELF_PROJECT_PATH: projectPath,
      },
      timeout: 3000,
    })

    // Strip ANSI codes before parsing
    const cleanOutput = stripAnsi(stdout)
    const lines = cleanOutput.split('\n').filter((line) => line.trim())
    runningServices = lines
      .filter(
        (line) =>
          line.includes('running') ||
          line.includes('healthy') ||
          line.includes('up'),
      )
      .map((line) => {
        const cleanLine = line.trim()
        const parts = cleanLine.split(/\s+/)
        return {
          name: parts[0] || 'unknown',
          status: cleanLine.includes('healthy') ? 'healthy' : 'running',
          details: cleanLine,
        }
      })

    servicesRunning = runningServices.length > 0
  } catch {
    // nself status failed or not installed, check Docker containers directly
  }

  // Check Docker containers related to this nself project
  let dockerContainers: any[] = []
  // Use already extracted project name or default to 'nself'
  let projectPrefix = projectNameFromEnv || 'nself'

  try {
    // Try docker-compose.yml as fallback if still default
    if (isBuilt && projectPrefix === 'nself') {
      try {
        const dockerComposeContent = await fs.readFile(
          dockerComposePath,
          'utf8',
        )
        const projectMatch = dockerComposeContent.match(/# Project: ([^\s\n]+)/)
        if (projectMatch) {
          projectPrefix = projectMatch[1].trim()
        }
      } catch {
        // docker-compose read failed, keep default
      }
    }

    // Get all containers with timeout to prevent hanging
    const { stdout } = await execAsync(
      'docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"',
      {
        timeout: 5000,
      },
    )
    const lines = stdout.split('\n').filter((line) => line.trim())

    // Filter for containers from this project (flexible matching)
    const projectContainers = lines.filter((line) => {
      const containerName = line.split('\t')[0].toLowerCase()
      const prefixLower = projectPrefix.toLowerCase()
      return (
        containerName.startsWith(prefixLower + '_') ||
        containerName.startsWith(prefixLower + '-') ||
        containerName.startsWith('nself_') ||
        containerName.startsWith('nself-')
      )
    })

    dockerContainers = projectContainers.map((line) => {
      const parts = line.split('\t')
      const name = parts[0] || 'unknown'
      const status = parts[1] || 'unknown'

      // Parse container status to determine if it's running
      const isRunning = status.toLowerCase().includes('up')
      const isHealthy = status.toLowerCase().includes('healthy')
      const isUnhealthy = status.toLowerCase().includes('unhealthy')

      // Add to running services if we didn't get them from nself status
      if (isRunning && runningServices.length === 0) {
        runningServices.push({
          name: name,
          status: isHealthy ? 'healthy' : isUnhealthy ? 'unhealthy' : 'running',
          details: status,
        })
      }

      return {
        name: name,
        status: status,
        ports: parts[2] || 'none',
      }
    })

    // If we have Docker containers running and didn't get services from nself status, mark as running
    if (dockerContainers.length > 0 && !servicesRunning) {
      servicesRunning = dockerContainers.some((c) =>
        c.status.toLowerCase().includes('up'),
      )
    }
  } catch {
    // Docker command failed or no containers
    dockerContainers = []
  }

  // Determine project state
  let projectState = 'empty'
  let needsSetup = true
  let projectName = null
  let baseDomain = null
  let isMinimalSetup = false

  if (hasEnvFile && envContent) {
    // Parse basic config from env files
    const baseDomainMatch = envContent.match(/BASE_DOMAIN=(.+)/)

    // Use already extracted projectName or try to find it in combined content
    projectName = projectNameFromEnv
    baseDomain = baseDomainMatch
      ? baseDomainMatch[1].trim().replace(/["']/g, '')
      : null

    // Check if this is a minimal setup (only basic env vars, no service configuration)
    // A minimal setup has PROJECT_NAME and BASE_DOMAIN but lacks service-specific configuration
    const hasServiceConfig =
      envContent.includes('POSTGRES_DB') ||
      envContent.includes('POSTGRES_USER') ||
      envContent.includes('HASURA_GRAPHQL_ADMIN_SECRET') ||
      envContent.includes('AUTH_HOST') ||
      envContent.includes('SERVICES_ENABLED') ||
      envContent.includes('FRONTEND_APP_')

    // Check if this looks like a minimal/template env file
    isMinimalSetup = !!projectName && !!baseDomain && !hasServiceConfig

    if (servicesRunning) {
      projectState = 'running'
      needsSetup = false
    } else if (isBuilt) {
      projectState = 'configured'
      needsSetup = false
    } else if (isMinimalSetup) {
      // This is a minimal setup - needs wizard
      projectState = 'empty'
      needsSetup = true
    } else if (hasServiceConfig) {
      // Has service configuration but not built yet
      projectState = 'configured'
      needsSetup = false
    } else {
      // Has env file but incomplete
      projectState = 'partial'
      needsSetup = true
    }
  }

  // Check for admin password setup (stored in LokiJS database, not env file)
  const hasAdminPassword = await checkAdminPassword()

  const payload: StatusPayload = {
    success: true,
    projectState,
    needsSetup,
    hasEnvFile,
    hasDockerCompose: isBuilt,
    isBuilt,
    hasAdminPassword,
    servicesRunning,
    runningServices,
    dockerContainers,
    containerCount: dockerContainers.length,
    config: {
      projectName,
      baseDomain,
    },
    projectPath,
    summary: {
      initialized: hasEnvFile,
      configured: hasEnvFile && (projectName || baseDomain),
      built: isBuilt,
      running: servicesRunning,
    },
  }

  // Populate the module-level cache before returning
  _cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS }

  return payload
}

export async function GET(): Promise<NextResponse> {
  // Return cached result if still fresh — sub-millisecond response for all
  // concurrent callers after the first request warms the cache.
  if (_cache && Date.now() < _cache.expiresAt) {
    return NextResponse.json(_cache.payload)
  }

  // Deduplicate concurrent requests: if a slow compute is already running,
  // subsequent requests await the same promise rather than spawning duplicate
  // shell commands.  The check-and-assign is synchronous so no two requests
  // can both see _inFlight === null in the same event-loop tick.
  if (!_inFlight) {
    _inFlight = computeStatus().finally(() => {
      _inFlight = null
    })
  }

  try {
    const payload = await _inFlight
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check project status',
        error: error instanceof Error ? error.message : 'Unknown error',
        projectState: 'unknown',
        needsSetup: true,
      },
      { status: 500 },
    )
  }
}
