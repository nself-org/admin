import { readEnvFile, writeEnvFile } from '@/lib/env-handler'
import {
  requireAuthPreSetup,
  requireWizardNotComplete,
} from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuthPreSetup(request)
  if (authError) return authError
  const wizardError = await requireWizardNotComplete(request)
  if (wizardError) return wizardError

  try {
    // Read the current env file
    const currentEnv = await readEnvFile()
    if (!currentEnv) {
      return NextResponse.json(
        { error: 'No environment configuration found' },
        { status: 400 },
      )
    }

    // Organize the env file in the proper order
    const organized: Record<string, string> = {}

    // 1. Core Project Settings (most important at top)
    const coreKeys = [
      'PROJECT_NAME',
      'PROJECT_DESCRIPTION',
      'ENV',
      'BASE_DOMAIN',
      'ADMIN_EMAIL',
    ]
    for (const key of coreKeys) {
      if (currentEnv[key]) {
        organized[key] = currentEnv[key]
      }
    }

    // 2. Database Configuration
    const dbKeys = [
      'POSTGRES_DB',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'HASURA_METADATA_DATABASE_URL',
    ]
    for (const key of dbKeys) {
      if (currentEnv[key]) {
        organized[key] = currentEnv[key]
      }
    }

    // 3. Hasura Configuration
    const hasuraKeys = Object.keys(currentEnv)
      .filter(
        (k) => k.startsWith('HASURA_') && !k.includes('METADATA_DATABASE_URL'),
      )
      .sort()
    for (const key of hasuraKeys) {
      organized[key] = currentEnv[key]
    }

    // 4. Auth Configuration
    const authKeys = Object.keys(currentEnv)
      .filter((k) => k.startsWith('AUTH_'))
      .sort()
    for (const key of authKeys) {
      organized[key] = currentEnv[key]
    }

    // 5. Service Enable Flags (Core Services)
    const coreServiceFlags = [
      'POSTGRES_ENABLED',
      'HASURA_ENABLED',
      'AUTH_ENABLED',
      'STORAGE_ENABLED',
    ]
    for (const key of coreServiceFlags) {
      if (currentEnv[key]) {
        organized[key] = currentEnv[key]
      }
    }

    // 6. Optional Service Flags
    const optionalServiceFlags = [
      'NSELF_ADMIN_ENABLED',
      'REDIS_ENABLED',
      'MLFLOW_ENABLED',
      'MAILPIT_ENABLED',
      'SEARCH_ENABLED',
      'MONITORING_ENABLED',
      'PROMETHEUS_ENABLED',
      'GRAFANA_ENABLED',
      'LOKI_ENABLED',
      'TEMPO_ENABLED',
      'ALERTMANAGER_ENABLED',
    ]
    for (const key of optionalServiceFlags) {
      if (currentEnv[key]) {
        organized[key] = currentEnv[key]
      }
    }

    // 7. Service Credentials (only if services are enabled)
    if (currentEnv.STORAGE_ENABLED === 'true') {
      if (currentEnv.MINIO_ROOT_USER)
        organized.MINIO_ROOT_USER = currentEnv.MINIO_ROOT_USER
      if (currentEnv.MINIO_ROOT_PASSWORD)
        organized.MINIO_ROOT_PASSWORD = currentEnv.MINIO_ROOT_PASSWORD
    }

    if (currentEnv.SEARCH_ENABLED === 'true') {
      if (currentEnv.MEILI_MASTER_KEY)
        organized.MEILI_MASTER_KEY = currentEnv.MEILI_MASTER_KEY
    }

    if (
      currentEnv.MONITORING_ENABLED === 'true' ||
      currentEnv.GRAFANA_ENABLED === 'true'
    ) {
      if (currentEnv.GRAFANA_ADMIN_PASSWORD)
        organized.GRAFANA_ADMIN_PASSWORD = currentEnv.GRAFANA_ADMIN_PASSWORD
    }

    // 8. Nginx Configuration
    const nginxKeys = Object.keys(currentEnv)
      .filter((k) => k.startsWith('NGINX_'))
      .sort()
    for (const key of nginxKeys) {
      organized[key] = currentEnv[key]
    }

    // 9. Custom Services
    if (currentEnv.SERVICES_ENABLED) {
      organized.SERVICES_ENABLED = currentEnv.SERVICES_ENABLED
    }

    // Add CS_ entries (but only the ones that exist)
    const csKeys = Object.keys(currentEnv)
      .filter((k) => k.startsWith('CS_') && currentEnv[k])
      .sort((a, b) => {
        const numA = parseInt(a.replace('CS_', ''))
        const numB = parseInt(b.replace('CS_', ''))
        return numA - numB
      })
    for (const key of csKeys) {
      organized[key] = currentEnv[key]
    }

    // 10. Frontend Apps
    if (currentEnv.FRONTEND_APP_COUNT) {
      organized.FRONTEND_APP_COUNT = currentEnv.FRONTEND_APP_COUNT

      // Add frontend app entries in order
      const appCount = parseInt(currentEnv.FRONTEND_APP_COUNT)
      for (let i = 1; i <= appCount; i++) {
        const appKeys = [
          `FRONTEND_APP_${i}_DISPLAY_NAME`,
          `FRONTEND_APP_${i}_SYSTEM_NAME`,
          `FRONTEND_APP_${i}_TABLE_PREFIX`,
          `FRONTEND_APP_${i}_PORT`,
          `FRONTEND_APP_${i}_ROUTE`,
          `FRONTEND_APP_${i}_REMOTE_SCHEMA_NAME`,
          `FRONTEND_APP_${i}_REMOTE_SCHEMA_URL`,
        ]
        for (const key of appKeys) {
          if (currentEnv[key]) {
            organized[key] = currentEnv[key]
          }
        }
      }
    }

    // 11. Backup Configuration
    const backupKeys = [
      'BACKUP_ENABLED',
      'BACKUP_SCHEDULE',
      'BACKUP_RETENTION_DAYS',
      'BACKUP_DIR',
      'BACKUP_COMPRESSION',
      'BACKUP_ENCRYPTION',
    ]
    for (const key of backupKeys) {
      if (currentEnv[key]) {
        organized[key] = currentEnv[key]
      }
    }

    // 12. Any remaining keys that weren't categorized
    const handledKeys = new Set(Object.keys(organized))
    const remainingKeys = Object.keys(currentEnv)
      .filter((k) => !handledKeys.has(k))
      .sort()
    for (const key of remainingKeys) {
      // Skip empty CS_ entries and other empty values
      if (currentEnv[key] && currentEnv[key] !== '') {
        organized[key] = currentEnv[key]
      }
    }

    // Write the organized config back
    await writeEnvFile(organized)

    return NextResponse.json({
      success: true,
      message: 'Configuration finalized and organized',
      stats: {
        totalKeys: Object.keys(organized).length,
        removedEmpty:
          Object.keys(currentEnv).length - Object.keys(organized).length,
      },
    })
  } catch (error) {
    console.error('Error finalizing configuration:', error)
    return NextResponse.json(
      {
        error: 'Failed to finalize configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
