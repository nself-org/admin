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

    const { stdout } = await execAsync(`${nselfPath} k8s namespaces --json`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/k8s/namespaces', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      namespaces: result.namespaces ?? [],
      current: result.current ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list namespaces', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list namespaces',
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

    const { name, labels } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Namespace name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['k8s', 'namespaces', 'create', name]
    if (labels) args.push(`--labels=${JSON.stringify(labels)}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/namespaces', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Namespace ${name} created`,
      namespace: name,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to create namespace', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create namespace',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
