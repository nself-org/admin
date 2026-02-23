import { readEnvFile, updateEnvFile } from '@/lib/env-handler'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { frontendApps, environment = 'development' } = await request.json()

    // Read current env to check for existing apps
    const currentEnv = (await readEnvFile()) || {}

    // Build env updates for frontend apps
    const envUpdates: Record<string, string> = {}

    // Clear any existing frontend app variables by setting them empty
    // (we'll overwrite with new values)
    if (frontendApps && frontendApps.length > 0) {
      envUpdates.FRONTEND_APP_COUNT = String(frontendApps.length)

      frontendApps.forEach((app: any, index: number) => {
        const num = index + 1

        if (app.displayName) {
          envUpdates[`FRONTEND_APP_${num}_DISPLAY_NAME`] = app.displayName
        }
        if (app.systemName) {
          envUpdates[`FRONTEND_APP_${num}_SYSTEM_NAME`] = app.systemName
        }
        if (app.tablePrefix) {
          envUpdates[`FRONTEND_APP_${num}_TABLE_PREFIX`] = app.tablePrefix
        }

        // Port for routing
        if (app.localPort) {
          envUpdates[`FRONTEND_APP_${num}_PORT`] = String(app.localPort)
        }

        // Route (subdomain in dev, full domain in prod)
        if (app.productionUrl) {
          envUpdates[`FRONTEND_APP_${num}_ROUTE`] = app.productionUrl
        }

        // Remote schema for Hasura
        if (app.remoteSchemaUrl) {
          envUpdates[`FRONTEND_APP_${num}_REMOTE_SCHEMA_URL`] =
            app.remoteSchemaUrl
          // Auto-generate schema name if not provided
          if (!app.remoteSchemaName && app.tablePrefix) {
            envUpdates[`FRONTEND_APP_${num}_REMOTE_SCHEMA_NAME`] =
              `${app.tablePrefix}_schema`
          } else if (app.remoteSchemaName) {
            envUpdates[`FRONTEND_APP_${num}_REMOTE_SCHEMA_NAME`] =
              app.remoteSchemaName
          }
        }
      })

      // Clear any extra frontend apps from previous configurations (up to 99 apps)
      for (let i = frontendApps.length + 1; i <= 99; i++) {
        // Check if this app exists in current config
        if (
          currentEnv[`FRONTEND_APP_${i}_DISPLAY_NAME`] ||
          currentEnv[`FRONTEND_APP_${i}_TABLE_PREFIX`] ||
          currentEnv[`FRONTEND_APP_${i}_SYSTEM_NAME`]
        ) {
          // Clear it
          envUpdates[`FRONTEND_APP_${i}_DISPLAY_NAME`] = ''
          envUpdates[`FRONTEND_APP_${i}_SYSTEM_NAME`] = ''
          envUpdates[`FRONTEND_APP_${i}_TABLE_PREFIX`] = ''
          envUpdates[`FRONTEND_APP_${i}_PORT`] = ''
          envUpdates[`FRONTEND_APP_${i}_ROUTE`] = ''
          envUpdates[`FRONTEND_APP_${i}_REMOTE_SCHEMA_NAME`] = ''
          envUpdates[`FRONTEND_APP_${i}_REMOTE_SCHEMA_URL`] = ''
        }
      }
    } else {
      // If no frontend apps, just set count to 0
      envUpdates.FRONTEND_APP_COUNT = '0'
    }

    // Also ensure environment is set
    if (environment) {
      envUpdates.ENV = environment
    }

    // Use the centralized updateEnvFile which handles both .env.local and environment-specific files
    await updateEnvFile(envUpdates)

    return NextResponse.json({
      success: true,
      message: 'Frontend apps configuration updated',
      updates: envUpdates,
    })
  } catch (error) {
    console.error('Error updating frontend apps:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 },
    )
  }
}
