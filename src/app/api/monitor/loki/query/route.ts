import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { query, range } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 },
      )
    }

    // Mock data - in production, this would query actual Loki
    const now = Date.now()
    const points = range === '5m' ? 20 : range === '1h' ? 100 : 200
    const interval = range === '5m' ? 15000 : range === '1h' ? 36000 : 72000

    const levels = ['info', 'warning', 'error', 'debug'] as const
    const services = [
      'postgres',
      'hasura',
      'auth',
      'functions',
      'minio',
      'redis',
      'nginx',
    ]
    const messages = [
      'Request completed successfully',
      'Connection pool warning: high usage',
      'Failed to connect to database',
      'Cache hit ratio: 85%',
      'Backup completed',
      'Configuration reloaded',
      'Health check passed',
      'Query execution time: 45ms',
    ]

    const logs = Array.from({ length: points }, (_, i) => ({
      timestamp: new Date(now - (points - i) * interval).toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
    }))

    return NextResponse.json({
      success: true,
      logs,
      query,
      range,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
