import { getServiceStatus } from '@/lib/nself-service'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getServiceStatus('postgres')

    if (!result.success) {
      return NextResponse.json({
        success: true,
        data: { status: { running: false, health: 'stopped' as const } },
        timestamp: new Date().toISOString(),
      })
    }

    // For now, return basic status from nself-service
    // Full stats would require Docker stats API integration or postgres system views
    const stats = {
      status: {
        running: true,
        health: 'healthy' as const,
        // Note: Additional metrics like CPU/memory require Docker API or pg_stat_* views
        // These would be fetched via executeDbQuery() for database metrics
        // or docker stats API for container metrics
      },
      database: {
        // Database-specific stats would come from queries like:
        // SELECT version() -> version
        // SELECT COUNT(*) FROM pg_database -> databases
        // SELECT pg_size_pretty(pg_database_size(current_database())) -> size
        // SELECT count(*) FROM pg_stat_activity WHERE state = 'active' -> active connections
      },
    }

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      note: 'Basic stats only. Enable Docker API or configure pg_stat_* queries for full metrics.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PostgreSQL stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
