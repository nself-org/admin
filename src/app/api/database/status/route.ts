import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import type { DatabaseStatus } from '@/types/database'
import { NextResponse } from 'next/server'

/**
 * GET /api/database/status - Get database status
 * Executes `nself db status --json` or queries database directly
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Try to get status via nself CLI first
    const result = await executeNselfCommand('db', ['status', '--json'])

    if (result.success && result.stdout) {
      try {
        const status: DatabaseStatus = JSON.parse(result.stdout)
        logger.api('GET', '/api/database/status', 200, Date.now() - startTime)
        return NextResponse.json({
          success: true,
          data: status,
        })
      } catch (_parseError) {
        // JSON parse failed, return raw output
        logger.warn('Failed to parse database status JSON', {
          stdout: result.stdout,
        })
        return NextResponse.json({
          success: true,
          data: {
            connected: true,
            raw: result.stdout,
          },
        })
      }
    }

    // If CLI command fails, try direct database query as fallback
    const { Client } = await import('pg')
    const client = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres-dev-password',
      database: process.env.POSTGRES_DB || 'nself',
    })

    await client.connect()

    // Get database size
    const sizeResult = await client.query(
      'SELECT pg_database_size(current_database()) as size',
    )

    // Get table count
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)

    // Get connection info
    const connectionsResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
      FROM pg_stat_activity
      WHERE datname = current_database()
    `)

    // Get version
    const versionResult = await client.query('SELECT version()')

    // Get uptime
    const uptimeResult = await client.query(
      'SELECT NOW() - pg_postmaster_start_time() as uptime',
    )

    await client.end()

    const formatBytes = (bytes: number): string => {
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      if (bytes === 0) return '0 B'
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return (
        Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
      )
    }

    const formatUptime = (interval: unknown): string => {
      if (!interval) return 'Unknown'
      const intervalStr = String(interval)
      const match = intervalStr.match(/(\d+) days? (\d+):(\d+):(\d+)/)
      if (match) {
        const days = parseInt(match[1])
        const hours = parseInt(match[2])
        if (days > 0) {
          return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`
        }
        return `${hours} hour${hours > 1 ? 's' : ''}`
      }
      return intervalStr
    }

    const status: DatabaseStatus = {
      connected: true,
      version:
        versionResult.rows[0].version.split(' ')[0] +
        ' ' +
        versionResult.rows[0].version.split(' ')[1],
      size: formatBytes(parseInt(sizeResult.rows[0].size)),
      tables: parseInt(tablesResult.rows[0].count),
      connections: {
        active: parseInt(connectionsResult.rows[0].active || '0'),
        idle: parseInt(connectionsResult.rows[0].idle || '0'),
        max: parseInt(connectionsResult.rows[0].max || '100'),
      },
      uptime: formatUptime(uptimeResult.rows[0].uptime),
    }

    logger.api('GET', '/api/database/status', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    logger.error('Failed to get database status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get database status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
