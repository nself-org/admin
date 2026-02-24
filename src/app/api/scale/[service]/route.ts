import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface RouteParams {
  params: Promise<{ service: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const { service } = await params
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} scale status ${service} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', `/api/scale/${service}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      service,
      currentReplicas: result.currentReplicas ?? 1,
      desiredReplicas: result.desiredReplicas ?? 1,
      minReplicas: result.minReplicas ?? 1,
      maxReplicas: result.maxReplicas ?? 10,
      autoscaling: result.autoscaling ?? null,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get service scale status', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get service scale status',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const { service } = await params
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { replicas } = body

    if (replicas === undefined || replicas < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid replica count is required' },
        { status: 400 },
      )
    }

    const { stdout } = await execAsync(
      `${nselfPath} scale ${service} --replicas=${replicas} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', `/api/scale/${service}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Scaled ${service} to ${replicas} replicas`,
      service,
      replicas,
      previousReplicas: result.previousReplicas,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to scale service', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scale service',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
