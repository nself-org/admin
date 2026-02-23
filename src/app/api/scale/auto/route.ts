import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} scale auto status --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/scale/auto', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      enabled: result.enabled ?? false,
      policies: result.policies ?? [],
      metrics: result.metrics ?? [],
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get autoscaling config', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get autoscaling config',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const {
      service,
      enabled,
      minReplicas,
      maxReplicas,
      targetCPU,
      targetMemory,
      scaleUpPolicy,
      scaleDownPolicy,
    } = body

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['scale', 'auto', 'configure', service]
    if (enabled !== undefined) args.push(enabled ? '--enable' : '--disable')
    if (minReplicas) args.push(`--min=${minReplicas}`)
    if (maxReplicas) args.push(`--max=${maxReplicas}`)
    if (targetCPU) args.push(`--target-cpu=${targetCPU}`)
    if (targetMemory) args.push(`--target-memory=${targetMemory}`)
    if (scaleUpPolicy)
      args.push(`--scale-up-policy=${JSON.stringify(scaleUpPolicy)}`)
    if (scaleDownPolicy)
      args.push(`--scale-down-policy=${JSON.stringify(scaleDownPolicy)}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/scale/auto', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Autoscaling configured for ${service}`,
      service,
      config: {
        enabled: enabled ?? true,
        minReplicas,
        maxReplicas,
        targetCPU,
        targetMemory,
      },
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to configure autoscaling', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to configure autoscaling',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
