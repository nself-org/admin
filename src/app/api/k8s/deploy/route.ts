import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const args: string[] = ['k8s', 'deploy']
    if (body.namespace) args.push(`--namespace=${body.namespace}`)
    if (body.image) args.push(`--image=${body.image}`)
    if (body.tag) args.push(`--tag=${body.tag}`)
    if (body.replicas) args.push(`--replicas=${body.replicas}`)
    if (body.services && Array.isArray(body.services)) {
      args.push(`--services=${body.services.join(',')}`)
    }

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 300000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/deploy', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Deployed to K8s',
      deployments: result.deployments ?? [],
      status: result.status,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to deploy to K8s', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deploy to K8s',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
