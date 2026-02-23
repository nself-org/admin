import { readEnvFile } from '@/lib/env-handler'
import { getProjectPath } from '@/lib/paths'
import { existsSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'

interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { config: _config } = await request.json()
    const issues: ValidationIssue[] = []
    const projectPath = getProjectPath()

    // Read the actual env file to verify it exists and is properly formatted
    const env = await readEnvFile()
    if (!env) {
      issues.push({
        field: 'env',
        message: 'Environment file not found or is empty',
        severity: 'error',
      })
      return NextResponse.json({ issues })
    }

    // Check required environment variables
    const requiredVars = [
      'PROJECT_NAME',
      'ENV',
      'BASE_DOMAIN',
      'POSTGRES_DB',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'HASURA_GRAPHQL_ADMIN_SECRET',
      'HASURA_JWT_KEY',
    ]

    for (const varName of requiredVars) {
      if (!env[varName]) {
        issues.push({
          field: varName,
          message: `Required variable ${varName} is missing`,
          severity: 'error',
        })
      }
    }

    // Check if HASURA_METADATA_DATABASE_URL is present (required for Hasura to connect)
    if (!env.HASURA_METADATA_DATABASE_URL) {
      issues.push({
        field: 'HASURA_METADATA_DATABASE_URL',
        message: 'Database URL for Hasura metadata is missing',
        severity: 'error',
      })
    }

    // Check service credentials when services are enabled
    if (env.STORAGE_ENABLED === 'true' || env.MINIO_ENABLED === 'true') {
      if (!env.MINIO_ROOT_USER || !env.MINIO_ROOT_PASSWORD) {
        issues.push({
          field: 'minio',
          message:
            'MinIO credentials missing (MINIO_ROOT_USER, MINIO_ROOT_PASSWORD)',
          severity: 'warning',
        })
      }
    }

    if (env.SEARCH_ENABLED === 'true') {
      if (!env.MEILI_MASTER_KEY) {
        issues.push({
          field: 'search',
          message: 'MeiliSearch master key missing (MEILI_MASTER_KEY)',
          severity: 'warning',
        })
      }
    }

    if (env.MONITORING_ENABLED === 'true' || env.GRAFANA_ENABLED === 'true') {
      if (!env.GRAFANA_ADMIN_PASSWORD) {
        issues.push({
          field: 'grafana',
          message: 'Grafana admin password missing (GRAFANA_ADMIN_PASSWORD)',
          severity: 'warning',
        })
      }

      // Check all monitoring services are enabled
      const monitoringServices = [
        'PROMETHEUS_ENABLED',
        'GRAFANA_ENABLED',
        'LOKI_ENABLED',
        'TEMPO_ENABLED',
        'ALERTMANAGER_ENABLED',
      ]
      const missingMonitoring = monitoringServices.filter(
        (s) => env[s] !== 'true',
      )
      if (env.MONITORING_ENABLED === 'true' && missingMonitoring.length > 0) {
        issues.push({
          field: 'monitoring',
          message: `Monitoring bundle enabled but missing services: ${missingMonitoring.join(', ')}`,
          severity: 'warning',
        })
      }
    }

    // Check custom services
    if (env.SERVICES_ENABLED === 'true') {
      let hasServices = false
      for (let i = 1; i <= 99; i++) {
        if (env[`CS_${i}`]) {
          hasServices = true
          const serviceDef = env[`CS_${i}`]
          const parts = serviceDef.split(':')
          if (parts.length < 3) {
            issues.push({
              field: `CS_${i}`,
              message: `Invalid service definition format (expected name:framework:port:route)`,
              severity: 'error',
            })
          }
        }
      }
      if (!hasServices) {
        issues.push({
          field: 'customServices',
          message: 'SERVICES_ENABLED is true but no CS_* services defined',
          severity: 'warning',
        })
      }
    }

    // Check frontend apps
    const appCount = parseInt(env.FRONTEND_APP_COUNT || '0')
    for (let i = 1; i <= appCount; i++) {
      const hasDisplay = env[`FRONTEND_APP_${i}_DISPLAY_NAME`]
      const hasTable = env[`FRONTEND_APP_${i}_TABLE_PREFIX`]
      const hasPort = env[`FRONTEND_APP_${i}_PORT`]

      if (!hasDisplay && !hasTable) {
        issues.push({
          field: `frontendApp${i}`,
          message: `Frontend app ${i} is missing display name and table prefix`,
          severity: 'warning',
        })
      }

      if (!hasPort) {
        issues.push({
          field: `frontendApp${i}`,
          message: `Frontend app ${i} is missing port configuration`,
          severity: 'warning',
        })
      }
    }

    // Check for port conflicts
    const usedPorts = new Set<string>()

    // Default service ports
    usedPorts.add('5432') // PostgreSQL
    usedPorts.add('8080') // Hasura
    usedPorts.add('4000') // Auth
    usedPorts.add('80') // Nginx HTTP
    usedPorts.add('443') // Nginx HTTPS

    // Optional service ports
    if (env.REDIS_ENABLED === 'true') usedPorts.add('6379')
    if (env.STORAGE_ENABLED === 'true') {
      usedPorts.add('9000') // MinIO API
      usedPorts.add('9001') // MinIO Console
    }
    if (env.MLFLOW_ENABLED === 'true') usedPorts.add('5000')
    if (env.MAILPIT_ENABLED === 'true') {
      usedPorts.add('1025') // SMTP
      usedPorts.add('8025') // Web UI
    }
    if (env.SEARCH_ENABLED === 'true') usedPorts.add('7700')
    if (env.MONITORING_ENABLED === 'true') {
      usedPorts.add('9090') // Prometheus
      usedPorts.add('3000') // Grafana
      usedPorts.add('3100') // Loki
      usedPorts.add('3200') // Tempo
      usedPorts.add('9093') // Alertmanager
    }
    if (env.NSELF_ADMIN_ENABLED === 'true') usedPorts.add('3021')

    // Check custom service ports
    for (let i = 1; i <= 99; i++) {
      if (env[`CS_${i}`]) {
        const parts = env[`CS_${i}`].split(':')
        if (parts[2]) {
          if (usedPorts.has(parts[2])) {
            issues.push({
              field: `CS_${i}`,
              message: `Port ${parts[2]} is already in use`,
              severity: 'error',
            })
          }
          usedPorts.add(parts[2])
        }
      }
    }

    // Check frontend app ports
    for (let i = 1; i <= appCount; i++) {
      const port = env[`FRONTEND_APP_${i}_PORT`]
      if (port) {
        if (usedPorts.has(port)) {
          issues.push({
            field: `frontendApp${i}`,
            message: `Port ${port} is already in use`,
            severity: 'error',
          })
        }
        usedPorts.add(port)
      }
    }

    // Check for docker-compose.yml existence (indicates if project has been built)
    const dockerComposePath = join(projectPath, 'docker-compose.yml')
    const hasDockerCompose = existsSync(dockerComposePath)

    if (hasDockerCompose) {
      // If docker-compose exists, warn that rebuild might be needed
      issues.push({
        field: 'docker',
        message:
          'Project already built. Configuration changes will require rebuild.',
        severity: 'warning',
      })
    }

    return NextResponse.json({
      success: true,
      issues,
      summary: {
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        hasDockerCompose,
      },
    })
  } catch (error) {
    console.error('Error validating configuration:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
