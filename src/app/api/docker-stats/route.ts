import { NextResponse } from 'next/server'

/**
 * Summarise every running container's healthcheck and resource limits.
 * Reads from dockerode (shared across the admin app).
 */

interface ContainerInfo {
  id: string
  name: string
  image: string
  state: string
  status: string
  health: 'healthy' | 'unhealthy' | 'starting' | 'none'
  healthCheck: {
    test: string[]
    interval: number | null
    timeout: number | null
    retries: number | null
    startPeriod: number | null
  } | null
  resources: {
    cpuShares: number | null
    cpuQuota: number | null
    cpuPeriod: number | null
    memoryLimitBytes: number | null
    memoryReservationBytes: number | null
    pidsLimit: number | null
  }
}

export async function GET() {
  try {
    // Dynamic import so the route still works in environments without dockerode
    // (eg. during next build, or on test boxes).
    const { default: Docker } = await import('dockerode')
    const docker = new Docker()
    const containers = await docker.listContainers({ all: true })

    const details: ContainerInfo[] = await Promise.all(
      containers.map(async (c) => {
        try {
          const container = docker.getContainer(c.Id)
          const inspect = (await container.inspect()) as unknown as Record<
            string,
            unknown
          >
          const config = (inspect.Config ?? {}) as Record<string, unknown>
          const hostConfig = (inspect.HostConfig ?? {}) as Record<
            string,
            unknown
          >
          const state = (inspect.State ?? {}) as Record<string, unknown>
          const healthObj = state.Health as
            | { Status?: 'healthy' | 'unhealthy' | 'starting' | 'none' }
            | undefined
          const healthcheck = config.Healthcheck as
            | {
                Test?: string[]
                Interval?: number
                Timeout?: number
                Retries?: number
                StartPeriod?: number
              }
            | undefined

          return {
            id: c.Id.slice(0, 12),
            name: (c.Names[0] ?? '').replace(/^\//, ''),
            image: c.Image,
            state: (state.Status as string | undefined) ?? c.State,
            status: c.Status,
            health: (healthObj?.Status as ContainerInfo['health']) ?? 'none',
            healthCheck: healthcheck
              ? {
                  test: healthcheck.Test ?? [],
                  interval: healthcheck.Interval ?? null,
                  timeout: healthcheck.Timeout ?? null,
                  retries: healthcheck.Retries ?? null,
                  startPeriod: healthcheck.StartPeriod ?? null,
                }
              : null,
            resources: {
              cpuShares: (hostConfig.CpuShares as number | undefined) ?? null,
              cpuQuota: (hostConfig.CpuQuota as number | undefined) ?? null,
              cpuPeriod: (hostConfig.CpuPeriod as number | undefined) ?? null,
              memoryLimitBytes:
                (hostConfig.Memory as number | undefined) ?? null,
              memoryReservationBytes:
                (hostConfig.MemoryReservation as number | undefined) ?? null,
              pidsLimit: (hostConfig.PidsLimit as number | undefined) ?? null,
            },
          }
        } catch (_err) {
          return {
            id: c.Id.slice(0, 12),
            name: (c.Names[0] ?? '').replace(/^\//, ''),
            image: c.Image,
            state: c.State,
            status: c.Status,
            health: 'none' as const,
            healthCheck: null,
            resources: {
              cpuShares: null,
              cpuQuota: null,
              cpuPeriod: null,
              memoryLimitBytes: null,
              memoryReservationBytes: null,
              pidsLimit: null,
            },
          }
        }
      }),
    )

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      containers: details,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Docker not available.'
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        containers: [],
        error: msg,
      },
      { status: 200 }, // return 200 so the UI can render empty state gracefully
    )
  }
}
