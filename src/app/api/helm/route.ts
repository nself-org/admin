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

    const args: string[] = ['helm', 'list']
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

    logger.api('GET', '/api/helm', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      releases: result.releases ?? [],
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list helm releases', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list helm releases',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
