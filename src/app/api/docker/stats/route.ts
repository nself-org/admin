import { getDockerStatsCollector } from '@/services/DockerStatsCollector'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const collector = getDockerStatsCollector()
    const stats = await collector.collect()

    return NextResponse.json({
      success: true,
      data: {
        cpu: stats.cpu,
        memory: stats.memory,
        storage: stats.storage,
        network: stats.network,
        containers: stats.containers.total,
        containerDetails: stats.containers,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Docker stats',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
