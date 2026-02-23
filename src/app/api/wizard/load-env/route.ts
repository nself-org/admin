import { getProjectPath } from '@/lib/paths'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // Get the project path using centralized resolution
    const projectPath = getProjectPath()

    // Try to read from multiple env files in priority order to get current config
    let envContent = ''
    const filesToTry = ['.env', '.env.prod', '.env.staging', '.env.dev'] // Reverse priority for reading

    for (const fileName of filesToTry) {
      try {
        const filePath = path.join(projectPath, fileName)
        const content = await fs.readFile(filePath, 'utf8')
        envContent = content + '\n' + envContent // Prepend so later files override
      } catch {
        // File doesn't exist, continue
      }
    }

    if (envContent) {
      // Parse env file into config object
      const config: any = {
        projectName: '',
        environment: 'development', // nself default
        domain: 'local.nself.org', // nself default
        databaseName: 'nself', // nself default
        backupSchedule: '0 2 * * *',
        optionalServices: {
          redis: false,
          mail: false,
          monitoring: false,
          mlflow: false,
          search: { enabled: false, provider: 'auto' },
          admin: false,
        },
        customServices: [],
        frontendApps: [],
      }

      // Parse each line
      const lines = envContent.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        const match = trimmed.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')

          // Map env variables to config
          switch (key) {
            case 'PROJECT_NAME':
              config.projectName = value
              break
            case 'ENV':
            case 'ENVIRONMENT':
              config.environment = value
              break
            case 'BASE_DOMAIN':
              config.domain = value
              break
            case 'POSTGRES_DB':
              config.databaseName = value
              break
            case 'BACKUP_SCHEDULE':
              config.backupSchedule = value
              break
            case 'REDIS_ENABLED':
              config.optionalServices.redis = value === 'true'
              break
            case 'MAILPIT_ENABLED':
              config.optionalServices.mail = value === 'true'
              break
            case 'MONITORING_ENABLED':
              config.optionalServices.monitoring = value === 'true'
              break
            case 'MLFLOW_ENABLED':
              config.optionalServices.mlflow = value === 'true'
              break
            case 'SEARCH_ENABLED':
              config.optionalServices.search.enabled = value === 'true'
              break
            case 'SEARCH_PROVIDER':
              config.optionalServices.search.provider = value
              break
            case 'NSELF_ADMIN_ENABLED':
              config.optionalServices.admin = value === 'true'
              break
            case 'USER_SERVICES':
              // Parse user services format: "service1:nest:4000,service2:express:4001"
              if (value) {
                const services = value.split(',')
                config.customServices = services.map((s) => {
                  const [name, framework, port, route] = s.split(':')
                  return {
                    name,
                    framework,
                    port: parseInt(port) || 4000,
                    route: route || '',
                  }
                })
              }
              break
            case 'FRONTEND_APPS':
              // Parse frontend apps format: "app_1:App 1:app1_:3001:app1"
              if (value) {
                const apps = value.split(',')
                config.frontendApps = apps.map((a) => {
                  const [name, displayName, tablePrefix, port, subdomain] =
                    a.split(':')
                  return {
                    name,
                    displayName,
                    tablePrefix,
                    port: parseInt(port) || 3000,
                    subdomain,
                  }
                })
              }
              break
          }
        }
      }

      return NextResponse.json({
        success: true,
        config,
        hasEnvFile: true,
      })
    } else {
      // No env files exist
      return NextResponse.json({
        success: true,
        config: null,
        hasEnvFile: false,
      })
    }
  } catch (error) {
    console.error('Error loading env config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load configuration' },
      { status: 500 },
    )
  }
}
