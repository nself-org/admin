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

    const namespace = searchParams.get('namespace')
    const allNamespaces = searchParams.get('all') === 'true'

    const args: string[] = ['k8s', 'services']
    if (namespace) args.push(`--namespace=${namespace}`)
    if (allNamespaces) args.push('--all-namespaces')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/k8s/services', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      services: result.services ?? [],
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list K8s services', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list K8s services',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
