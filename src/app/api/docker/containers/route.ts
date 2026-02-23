import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

// Known distroless services that can't use Docker healthcheck
// These services have no shell, so we check their HTTP endpoints directly
const DISTROLESS_SERVICES: Record<
  string,
  { port: number; path: string; internalPort?: number }
> = {
  tempo: { port: 3200, path: '/ready', internalPort: 3200 },
}

// Schema for query parameters
const querySchema = z.object({
  detailed: z.enum(['true', 'false']).optional(),
  stats: z.enum(['true', 'false']).optional(),
  all: z.enum(['true', 'false']).optional(),
})

function getServiceType(name: string, _labels: unknown): string {
  const n = name.toLowerCase()
  if (n.includes('postgres')) return 'database'
  if (n.includes('hasura')) return 'api'
  if (n.includes('auth')) return 'auth'
  if (n.includes('nginx')) return 'proxy'
  if (n.includes('minio')) return 'storage'
  if (n.includes('redis')) return 'cache'
  if (n.includes('mailpit')) return 'mail'
  if (n.includes('bull')) return 'worker'
  if (n.includes('nest')) return 'backend'
  return 'service'
}

function getServiceCategory(
  name: string,
  _labels: Record<string, unknown>,
): string {
  const n = name.toLowerCase()
  // Core/Required services (same as project info)
  if (['postgres', 'hasura', 'auth', 'nginx'].some((s) => n.includes(s)))
    return 'required'
  // Optional services including monitoring stack
  if (
    [
      'redis',
      'minio',
      'storage',
      'functions',
      'mailpit',
      'meilisearch',
      'mlflow',
      'nself-admin',
      'admin',
      'grafana',
      'prometheus',
      'loki',
      'tempo',
      'jaeger',
      'alertmanager',
      'node-exporter',
      'postgres-exporter',
      'cadvisor',
      'promtail',
      'redis-exporter',
      'minio-client',
    ].some((s) => n.includes(s))
  )
    return 'optional'
  // User/Custom services
  return 'user'
}

function getHealthStatus(status: string, state: string): string {
  // Check for explicit health indicators first
  if (status.includes('(healthy)')) return 'healthy'
  if (status.includes('(unhealthy)')) return 'unhealthy'

  // Map container states to user-friendly health statuses
  switch (state) {
    case 'running':
      return 'healthy' // Running containers are healthy
    case 'restarting':
      return 'restarting' // Restarting is a transitional state, not stopped
    case 'paused':
      return 'paused'
    case 'exited':
      return 'stopped'
    case 'dead':
      return 'stopped'
    case 'created':
      return 'created' // Created but not started
    default:
      return state // Return the raw state for unknown states
  }
}

// Check if a service is a known distroless image
function isDistrolessService(name: string): string | null {
  const lowerName = name.toLowerCase()
  for (const service of Object.keys(DISTROLESS_SERVICES)) {
    if (lowerName.includes(service)) {
      return service
    }
  }
  return null
}

// Check health of a distroless service via HTTP endpoint
async function checkDistrolessHealth(
  serviceName: string,
): Promise<{ healthy: boolean; checked: boolean }> {
  const config = DISTROLESS_SERVICES[serviceName]
  if (!config) return { healthy: false, checked: false }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(
      `http://localhost:${config.port}${config.path}`,
      {
        method: 'GET',
        signal: controller.signal,
      },
    )

    clearTimeout(timeout)
    return { healthy: response.ok, checked: true }
  } catch {
    // If we can't reach the endpoint, it's unhealthy
    return { healthy: false, checked: true }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Validate query parameters
    const params = {
      detailed: searchParams.get('detailed'),
      stats: searchParams.get('stats'),
      all: searchParams.get('all'),
    }

    const validation = querySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    const detailed = params.detailed === 'true'
    const withStats = params.stats === 'true'

    console.log(`[CONTAINERS API] Request params:`, {
      detailed,
      withStats,
      all: params.all,
    })

    // Get container list using docker ps safely
    const { stdout: containerJson } = await execFileAsync(
      'docker',
      ['ps', '-a', '--format', '{{json .}}'],
      { timeout: 10000 },
    )

    console.log(
      `[CONTAINERS API] Raw docker output length: ${containerJson.length} chars`,
    )

    const containers = containerJson
      .trim()
      .split('\n')
      .filter((line) => line)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter((c) => c !== null)

    console.log(
      `[CONTAINERS API] Parsed ${containers.length} total containers from docker`,
    )

    // Get project prefix for filtering containers
    let projectPrefix = 'nproj' // Default fallback
    try {
      const projectPath = getProjectPath()
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml')

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
        // File doesn't exist or can't read, use default
      }
    } catch {
      // Path error, use default
    }

    console.log(`[CONTAINERS API] Using project prefix: "${projectPrefix}"`)

    // Filter for project containers (unless explicitly requesting all)
    const showAll = searchParams.get('all') === 'true'

    // Debug: Log all container names before filtering
    console.log(
      `[CONTAINERS API] All container names:`,
      containers.map((c) => c.Names),
    )

    const projectContainers = showAll
      ? containers
      : containers.filter((container) => {
          const name = container.Names?.toLowerCase() || ''

          // Explicitly exclude buildx/buildkit containers - these are build infrastructure, not services
          if (name.includes('buildx_buildkit') || name.includes('buildkit')) {
            console.log(
              `[CONTAINERS API] ✗ Excluding buildx container: ${container.Names}`,
            )
            return false
          }

          const matches =
            name.startsWith(projectPrefix.toLowerCase() + '_') ||
            name.startsWith(projectPrefix.toLowerCase() + '-') ||
            name.startsWith('nself_') ||
            name.startsWith('nself-') ||
            // Also check if container name contains common nself service names
            [
              'postgres',
              'hasura',
              'grafana',
              'prometheus',
              'loki',
              'tempo',
              'alertmanager',
              'cadvisor',
              'node-exporter',
              'minio',
              'redis',
              'mailpit',
              'nginx',
              'auth',
              'storage',
              'functions',
            ].some((service) => name.includes(service))

          if (matches) {
            console.log(
              `[CONTAINERS API] ✓ Including container: ${container.Names} (State: ${container.State}, Status: ${container.Status})`,
            )
          }

          return matches
        })

    console.log(
      `[CONTAINERS API] Filtered to ${projectContainers.length} project containers`,
    )

    // Get stats if requested
    let statsMap = new Map()
    if (withStats && projectContainers.length > 0) {
      try {
        const containerIds = projectContainers.map((c) => c.ID)
        const { stdout: statsOutput } = await execFileAsync(
          'docker',
          ['stats', '--no-stream', '--format', '{{json .}}', ...containerIds],
          { timeout: 5000 },
        )

        statsOutput
          .trim()
          .split('\n')
          .filter((line) => line)
          .forEach((line) => {
            try {
              const stat = JSON.parse(line)
              statsMap.set(stat.Container || stat.ID, {
                cpu: parseFloat(stat.CPUPerc?.replace('%', '') || '0'),
                memory: {
                  usage: stat.MemUsage?.split('/')[0]?.trim() || '0',
                  limit: stat.MemUsage?.split('/')[1]?.trim() || '0',
                  percentage: parseFloat(stat.MemPerc?.replace('%', '') || '0'),
                },
              })
            } catch {
              // Ignore parse errors
            }
          })
      } catch {
        // Stats fetch failed - containers will be returned without live stats
      }
    }

    const formattedContainers = await Promise.all(
      projectContainers.map(async (container) => {
        const stats = statsMap.get(container.ID)
        let health = getHealthStatus(container.Status, container.State)
        let healthNote: string | undefined = undefined

        // Check if this is a known distroless service
        const distrolessService = isDistrolessService(container.Names)
        if (distrolessService) {
          // Distroless images can't use Docker healthcheck (no shell)
          // Always check via HTTP endpoint for accurate health status
          const httpCheck = await checkDistrolessHealth(distrolessService)
          if (httpCheck.checked) {
            const dockerSaysUnhealthy =
              container.Status?.includes('(unhealthy)')
            if (httpCheck.healthy) {
              health = 'healthy'
              healthNote = dockerSaysUnhealthy
                ? 'Docker healthcheck unavailable (distroless) - verified healthy via HTTP'
                : 'Verified via HTTP endpoint'
              if (dockerSaysUnhealthy) {
                console.log(
                  `[CONTAINERS API] ${container.Names}: Docker reports unhealthy but HTTP check passed`,
                )
              }
            } else {
              health = 'unhealthy'
              healthNote = 'HTTP endpoint check failed'
            }
          }
        }

        console.log(
          `[CONTAINERS API] Processing ${container.Names}: State=${container.State}, Status="${container.Status}", Health=${health}`,
        )

        return {
          id: container.ID,
          name: container.Names,
          image: container.Image,
          state: container.State, // Keep the actual Docker state
          status: container.Status,
          ports: container.Ports?.split(',')
            .map((p: string) => {
              const match = p.match(/(\d+)->(\d+)/)
              return match
                ? {
                    private: parseInt(match[2]),
                    public: parseInt(match[1]),
                    type: 'tcp',
                  }
                : null
            })
            .filter(
              (p: { private: number; public: number; type: string } | null) =>
                p,
            ),
          created: container.CreatedAt,
          serviceType: getServiceType(container.Names, {}),
          category: getServiceCategory(container.Names, {}),
          health: health,
          healthNote: healthNote,
          stats: stats || null,
        }
      }),
    )

    // Debug summary
    const healthCounts = formattedContainers.reduce(
      (acc, c) => {
        acc[c.health] = (acc[c.health] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    console.log(`[CONTAINERS API] Final summary:`, {
      total: formattedContainers.length,
      healthCounts,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: formattedContainers,
      count: formattedContainers.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch container status',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
