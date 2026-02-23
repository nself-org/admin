import { getPostgresCollector } from '@/services/PostgresCollector'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const collector = getPostgresCollector()
    const stats = await collector.collect()

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PostgreSQL stats',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
