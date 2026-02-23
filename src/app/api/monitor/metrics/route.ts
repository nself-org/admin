import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('query')
    const service = searchParams.get('service')
    const timeRange = searchParams.get('range') ?? '1h'
    const step = searchParams.get('step') ?? '15s'

    const args: string[] = ['monitor', 'metrics']
    if (query) args.push(`--query=${query}`)
    if (service) args.push(`--service=${service}`)
    args.push(`--range=${timeRange}`)
    args.push(`--step=${step}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/monitor/metrics', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      metrics: result.metrics ?? [],
      data: result.data ?? [],
      timeRange,
      step,
      availableMetrics: result.availableMetrics ?? [
        'cpu_usage',
        'memory_usage',
        'disk_usage',
        'network_io',
        'request_rate',
        'error_rate',
        'latency_p50',
        'latency_p95',
        'latency_p99',
      ],
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get metrics', { error: err.message })
    return NextResponse.json(
      { success: false, error: 'Failed to get metrics', details: err.message },
      { status: 500 },
    )
  }
}
