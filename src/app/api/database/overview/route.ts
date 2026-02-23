import { ErrorCode } from '@/lib/errors/codes'
import { executeDbQuery } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    // Get database status and stats
    const [statusResult, tablesResult, sizeResult] = await Promise.all([
      // Connection status and version
      executeDbQuery('SELECT version(), pg_postmaster_start_time()'),
      // Table count
      executeDbQuery(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'",
      ),
      // Database size
      executeDbQuery(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size',
      ),
    ])

    if (!statusResult.success || !tablesResult.success || !sizeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch database overview',
          code: ErrorCode.DB_CONNECTION_FAILED,
        },
        { status: 500 },
      )
    }

    // Parse results
    const versionLine = statusResult.stdout?.split('\n')[0] || ''
    const version = versionLine.match(/PostgreSQL\s+([\d.]+)/)?.[1] || 'Unknown'

    const tableCount = parseInt(
      tablesResult.stdout?.match(/\d+/)?.[0] || '0',
      10,
    )
    const dbSize = sizeResult.stdout?.split('\n')[0]?.trim() || '0 MB'

    // Get recent queries (mock for now - would need pg_stat_statements)
    const recentQueries: string[] = []

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        version,
        size: dbSize,
        tables: tableCount,
        connections: {
          active: 1,
          idle: 0,
          max: 100,
        },
        uptime: 'Unknown',
        recentQueries,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database overview failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_CONNECTION_FAILED,
      },
      { status: 500 },
    )
  }
}
