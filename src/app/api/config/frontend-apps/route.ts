import { getProjectPath } from '@/lib/paths'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const envFiles = ['.env.dev', '.env.local', '.env.production', '.env']

    let envContent = ''
    for (const envFile of envFiles) {
      try {
        const envPath = path.join(projectPath, envFile)
        envContent = await fs.readFile(envPath, 'utf8')
        break
      } catch {
        // Try next file
      }
    }

    if (!envContent) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Parse environment variables
    const envVars: Record<string, string> = {}
    envContent.split('\n').forEach((line) => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
        envVars[key] = value
      }
    })

    // Parse frontend apps
    const appCount = parseInt(envVars.FRONTEND_APP_COUNT || '0')
    const apps = []

    for (let i = 1; i <= appCount; i++) {
      const displayName = envVars[`FRONTEND_APP_${i}_DISPLAY_NAME`]
      const systemName = envVars[`FRONTEND_APP_${i}_SYSTEM_NAME`]
      const port = envVars[`FRONTEND_APP_${i}_PORT`]
      const route = envVars[`FRONTEND_APP_${i}_ROUTE`]

      if (displayName && systemName) {
        apps.push({
          id: i,
          displayName: displayName,
          systemName: systemName,
          port: port ? parseInt(port) : null,
          route: route || null,
          url: port ? `http://localhost:${port}` : null,
          status: 'configured', // Since these are config-based, not Docker containers
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: apps,
    })
  } catch (error) {
    console.error('Failed to read frontend apps config:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read frontend apps configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
