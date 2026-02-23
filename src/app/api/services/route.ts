import { getDockerSocketPath, getProjectPath } from '@/lib/paths'
import { emitServiceStatus } from '@/lib/websocket/emitters'
import { exec } from 'child_process'
import Docker from 'dockerode'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Initialize Docker client
const docker = new Docker(
  process.env.DOCKER_HOST
    ? { host: process.env.DOCKER_HOST }
    : { socketPath: getDockerSocketPath() },
)

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const service = searchParams.get('service')

    switch (action) {
      case 'list':
        return await getServicesList()
      case 'details':
        if (!service) {
          return NextResponse.json(
            { success: false, error: 'Service name is required for details' },
            { status: 400 },
          )
        }
        return await getServiceDetails(service)
      case 'logs':
        if (!service) {
          return NextResponse.json(
            { success: false, error: 'Service name is required for logs' },
            { status: 400 },
          )
        }
        return await getServiceLogs(service, searchParams)
      case 'stats':
        return await getServicesStats()
      case 'health':
        return await getServicesHealth()
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Services operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { action, service, services, options = {} } = await request.json()

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 },
      )
    }

    const _backendPath = getProjectPath()

    switch (action) {
      case 'start':
        return await controlService(service, 'start')
      case 'stop':
        return await controlService(service, 'stop')
      case 'restart':
        return await controlService(service, 'restart')
      case 'scale':
        return await scaleService(service, options.replicas || 1)
      case 'batch':
        return await batchServiceControl(services, options.operation)
      case 'update':
        return await updateService(service, options)
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Service operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getServicesList() {
  try {
    // Get all containers
    const containers = await docker.listContainers({ all: true })

    // Format service data with enhanced information
    const services = await Promise.all(
      containers.map(async (container) => {
        const containerObj = docker.getContainer(container.Id)
        const inspect = await containerObj.inspect()

        return {
          id: container.Id,
          name: container.Names[0]?.replace(/^\//, ''),
          image: container.Image,
          state: container.State,
          status: container.Status,
          ports: container.Ports?.map((p) => ({
            private: p.PrivatePort,
            public: p.PublicPort,
            type: p.Type,
          })),
          labels: container.Labels,
          created: container.Created,
          serviceType: getServiceType(container.Names[0], container.Labels),
          category: getServiceCategory(container.Names[0], container.Labels),
          health: getHealthStatus(container.Status, container.State),

          // Enhanced information
          restartCount: inspect.RestartCount,
          startedAt: inspect.State.StartedAt,
          finishedAt: inspect.State.FinishedAt,
          platform: inspect.Platform,
          config: {
            hostname: inspect.Config.Hostname,
            domainname: inspect.Config.Domainname,
            user: inspect.Config.User,
            workingDir: inspect.Config.WorkingDir,
            entrypoint: inspect.Config.Entrypoint,
            cmd: inspect.Config.Cmd,
            env: inspect.Config.Env?.filter(
              (env) =>
                !env.includes('PASSWORD') &&
                !env.includes('SECRET') &&
                !env.includes('KEY'),
            ), // Filter out sensitive data
          },
          mounts: inspect.Mounts?.map((mount) => ({
            type: mount.Type,
            source: mount.Source,
            destination: mount.Destination,
            mode: mount.Mode,
            rw: mount.RW,
          })),
          networkSettings: {
            networks: Object.keys(inspect.NetworkSettings.Networks || {}),
            ipAddress: inspect.NetworkSettings.IPAddress,
            gateway: inspect.NetworkSettings.Gateway,
          },
        }
      }),
    )

    // Group services by category and type
    const grouped = {
      stack: services.filter((s) => s.category === 'stack'),
      services: services.filter((s) => s.category === 'services'),
      total: services.length,
      running: services.filter((s) => s.state === 'running').length,
      stopped: services.filter((s) => s.state === 'exited').length,
    }

    return NextResponse.json({
      success: true,
      data: {
        services,
        grouped,
        summary: {
          total: services.length,
          running: services.filter((s) => s.state === 'running').length,
          stopped: services.filter((s) => s.state === 'exited').length,
          healthy: services.filter((s) => s.health === 'healthy').length,
          unhealthy: services.filter((s) => s.health === 'unhealthy').length,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get services list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getServiceDetails(serviceName: string) {
  try {
    const containers = await docker.listContainers({ all: true })
    const container = containers.find((c) =>
      c.Names.some((name) => name.includes(serviceName)),
    )

    if (!container) {
      return NextResponse.json(
        {
          success: false,
          error: `Service '${serviceName}' not found`,
        },
        { status: 404 },
      )
    }

    const containerObj = docker.getContainer(container.Id)
    const inspect = await containerObj.inspect()
    const stats = await containerObj.stats({ stream: false })

    return NextResponse.json({
      success: true,
      data: {
        container: inspect,
        stats,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get details for service '${serviceName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getServiceLogs(
  serviceName: string,
  searchParams: URLSearchParams,
) {
  try {
    const containers = await docker.listContainers({ all: true })
    const container = containers.find((c) =>
      c.Names.some((name) => name.includes(serviceName)),
    )

    if (!container) {
      return NextResponse.json(
        {
          success: false,
          error: `Service '${serviceName}' not found`,
        },
        { status: 404 },
      )
    }

    const tail = searchParams.get('tail') || '100'
    const since = searchParams.get('since') || '1h'

    const containerObj = docker.getContainer(container.Id)
    const logs = await containerObj.logs({
      stdout: true,
      stderr: true,
      tail: parseInt(tail),
      since: since,
      timestamps: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        service: serviceName,
        logs: logs.toString(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get logs for service '${serviceName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getServicesStats() {
  try {
    const containers = await docker.listContainers({ all: false }) // Only running containers

    const stats = await Promise.all(
      containers.map(async (container) => {
        try {
          const containerObj = docker.getContainer(container.Id)
          const stat = await containerObj.stats({ stream: false })

          return {
            id: container.Id,
            name: container.Names[0]?.replace(/^\//, ''),
            stats: stat,
            timestamp: new Date().toISOString(),
          }
        } catch (error) {
          return {
            id: container.Id,
            name: container.Names[0]?.replace(/^\//, ''),
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get services stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getServicesHealth() {
  try {
    const backendPath = getProjectPath()

    // Get nself status
    const { stdout: nselfStatus } = await execAsync(
      `cd ${backendPath} && nself status`,
    )

    // Get Docker health checks
    const { stdout: dockerHealth } = await execAsync(
      `cd ${backendPath} && docker-compose ps`,
    )

    return NextResponse.json({
      success: true,
      data: {
        nself_status: nselfStatus.trim(),
        docker_health: dockerHealth.trim(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get services health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function controlService(serviceName: string, operation: string) {
  if (!serviceName) {
    return NextResponse.json(
      {
        success: false,
        error: 'Service name is required',
      },
      { status: 400 },
    )
  }

  const backendPath = getProjectPath()

  try {
    let command = ''
    switch (operation) {
      case 'start':
        command = `cd ${backendPath} && docker-compose start ${serviceName}`
        break
      case 'stop':
        command = `cd ${backendPath} && docker-compose stop ${serviceName}`
        break
      case 'restart':
        command = `cd ${backendPath} && docker-compose restart ${serviceName}`
        break
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown operation: ${operation}`,
          },
          { status: 400 },
        )
    }

    // Emit status update before operation
    emitServiceStatus({
      service: serviceName,
      status: operation === 'start' ? 'starting' : 'stopping',
      timestamp: new Date().toISOString(),
    })

    const { stdout, stderr } = await execAsync(command)

    // Emit status update after operation
    const newStatus =
      operation === 'start'
        ? 'running'
        : operation === 'stop'
          ? 'stopped'
          : 'running'
    emitServiceStatus({
      service: serviceName,
      status: newStatus,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        service: serviceName,
        operation,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    // Emit error status
    emitServiceStatus({
      service: serviceName,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: `Failed to ${operation} service '${serviceName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function scaleService(serviceName: string, replicas: number) {
  const backendPath = getProjectPath()

  try {
    const { stdout, stderr } = await execAsync(
      `cd ${backendPath} && docker-compose up -d --scale ${serviceName}=${replicas}`,
    )

    return NextResponse.json({
      success: true,
      data: {
        service: serviceName,
        replicas,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to scale service '${serviceName}' to ${replicas} replicas`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function batchServiceControl(services: string[], operation: string) {
  if (!services || services.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Services list is required',
      },
      { status: 400 },
    )
  }

  const results = await Promise.all(
    services.map(async (service) => {
      try {
        const result = await controlService(service, operation)
        return { service, success: true, result }
      } catch (error) {
        return {
          service,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }),
  )

  return NextResponse.json({
    success: true,
    data: {
      operation,
      services: services.length,
      results,
      timestamp: new Date().toISOString(),
    },
  })
}

async function updateService(serviceName: string, _options: unknown) {
  const backendPath = getProjectPath()

  try {
    // Pull latest image and recreate container
    const { stdout, stderr } = await execAsync(
      `cd ${backendPath} && docker-compose pull ${serviceName} && docker-compose up -d ${serviceName}`,
    )

    return NextResponse.json({
      success: true,
      data: {
        service: serviceName,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to update service '${serviceName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Helper functions (same as in docker containers API)
function getServiceType(containerName: string, _labels: unknown): string {
  const name = containerName?.toLowerCase() || ''

  if (name.includes('postgres')) return 'database'
  if (name.includes('hasura')) return 'graphql'
  if (name.includes('auth')) return 'auth'
  if (name.includes('redis')) return 'cache'
  if (name.includes('minio')) return 'storage'
  if (name.includes('nginx')) return 'proxy'
  if (name.includes('grafana')) return 'monitoring'
  if (name.includes('prometheus')) return 'metrics'
  if (name.includes('loki')) return 'logs'
  if (name.includes('jaeger')) return 'tracing'
  if (name.includes('alertmanager')) return 'alerts'
  if (name.includes('mailpit')) return 'email'
  if (name.includes('nestjs')) return 'nestjs'
  if (name.includes('bullmq')) return 'queue'
  if (name.includes('golang')) return 'golang'
  if (name.includes('python')) return 'python'

  return 'unknown'
}

function getServiceCategory(containerName: string, labels: any): string {
  const serviceType = getServiceType(containerName, labels)

  const stackServices = [
    'database',
    'graphql',
    'auth',
    'cache',
    'storage',
    'proxy',
    'monitoring',
    'metrics',
    'logs',
    'tracing',
    'alerts',
    'email',
  ]

  return stackServices.includes(serviceType) ? 'stack' : 'services'
}

function getHealthStatus(status: string, state: string): string {
  if (state === 'running') {
    if (status.includes('unhealthy')) return 'unhealthy'
    if (status.includes('starting') || status.includes('health: starting'))
      return 'starting'
    return 'healthy'
  }

  if (state === 'exited') return 'stopped'
  if (state === 'restarting') return 'starting'

  return 'unknown'
}
