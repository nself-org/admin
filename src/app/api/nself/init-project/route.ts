import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const config = await request.json()
    const projectPath = getProjectPath()

    // Find nself CLI using the centralized utility
    const nselfPath = await findNselfPath()

    // First, run nself init --full to create all env files
    const { stdout: initOut, stderr: initErr } = await execAsync(
      `${nselfPath} init --full`,
      {
        cwd: projectPath,
        env: {
          ...process.env,
          PATH: getEnhancedPath(),
        },
        timeout: 30000,
      },
    )

    if (initErr && !initErr.includes('warning')) {
      console.error('Init stderr:', initErr)
    }

    // Now read the .env.local file and update it with user's config
    const envPath = path.join(projectPath, '.env.local')
    let envContent = ''

    try {
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch (err) {
      console.error('Failed to read .env.local:', err)
      throw new Error('Failed to read .env.local file after init')
    }

    // Parse and update env variables
    const envLines = envContent.split('\n')
    const envMap = new Map<string, string>()

    // Parse existing env file
    for (const line of envLines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        if (key) {
          envMap.set(key.trim(), valueParts.join('=').trim())
        }
      }
    }

    // Update with user's configuration
    envMap.set('PROJECT_NAME', config.projectName || 'my_project')
    envMap.set('PROJECT_DESCRIPTION', config.projectDescription || '')
    envMap.set('ENV', config.environment || 'dev')
    envMap.set('BASE_DOMAIN', config.domain || 'localhost')
    envMap.set('POSTGRES_DB', config.databaseName || 'my_database')

    // Handle optional services
    if (config.services?.optional) {
      const optionalServices = config.services.optional

      // Redis
      envMap.set(
        'ENABLE_REDIS',
        optionalServices.includes('redis') ? 'true' : 'false',
      )

      // MinIO Storage
      envMap.set(
        'ENABLE_MINIO',
        optionalServices.includes('minio') ? 'true' : 'false',
      )

      // Monitoring Stack (includes Grafana, Prometheus, Loki, Tempo, AlertManager)
      envMap.set(
        'ENABLE_MONITORING',
        optionalServices.includes('monitoring') ? 'true' : 'false',
      )

      // ML/AI Stack
      envMap.set(
        'ENABLE_MLFLOW',
        optionalServices.includes('mlflow') ? 'true' : 'false',
      )

      // Email/SMTP
      envMap.set(
        'ENABLE_MAILPIT',
        optionalServices.includes('mailpit') ? 'true' : 'false',
      )

      // Search
      envMap.set(
        'ENABLE_ELASTICSEARCH',
        optionalServices.includes('elasticsearch') ? 'true' : 'false',
      )
    }

    // Handle user services - use CS_N format (nself no longer supports legacy format)
    if (config.services?.user && config.services.user.length > 0) {
      // Convert to CS_N format: name:framework:port:route
      const userServices = config.services.user
      envMap.set('SERVICES_ENABLED', 'true')
      for (let i = 0; i < userServices.length; i++) {
        const service = userServices[i]
        const serviceNum = i + 1
        const port = 4000 + i
        // Format: name:framework:port:route (route is optional)
        const parts = [
          service.name || `service_${serviceNum}`,
          service.framework || 'custom',
          String(port),
          service.route || '', // Empty route means internal-only
        ]
        envMap.set(`CS_${serviceNum}`, parts.join(':'))
      }
    }

    // Handle frontend apps
    if (config.frontendApps && config.frontendApps.length > 0) {
      for (let i = 0; i < config.frontendApps.length; i++) {
        const app = config.frontendApps[i]
        const appNum = i + 1
        envMap.set(`FRONTEND_APP_${appNum}_NAME`, app.name)
        envMap.set(
          `FRONTEND_APP_${appNum}_FRAMEWORK`,
          app.framework || 'nextjs',
        )
        envMap.set(`FRONTEND_APP_${appNum}_PORT`, String(3000 + appNum))
      }
      envMap.set('FRONTEND_APP_COUNT', String(config.frontendApps.length))
    }

    // Handle backup settings
    if (config.backup) {
      envMap.set('ENABLE_BACKUP', config.backup.enabled ? 'true' : 'false')
      if (config.backup.enabled) {
        envMap.set('BACKUP_SCHEDULE', config.backup.schedule || '0 2 * * *')
        envMap.set(
          'BACKUP_RETENTION_DAYS',
          String(config.backup.retentionDays || 7),
        )
        envMap.set('BACKUP_STORAGE', config.backup.storage || 'local')
      }
    }

    // Reconstruct the env file
    const newEnvContent = Array.from(envMap.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Write the updated .env.local file
    await fs.writeFile(envPath, newEnvContent + '\n', 'utf-8')

    return NextResponse.json({
      success: true,
      message: 'Project initialized and configured',
      output: initOut,
    })
  } catch (error) {
    console.error('Error initializing project:', error)
    return NextResponse.json(
      {
        error: 'Failed to initialize project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
