import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface RouteParams {
  params: Promise<{ name: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const { name } = await params
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} k8s namespaces get ${name} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api(
      'GET',
      `/api/k8s/namespaces/${name}`,
      200,
      Date.now() - startTime,
    )
    return NextResponse.json({
      success: true,
      namespace: result.namespace ?? { name },
      resources: result.resources ?? {},
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get namespace', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get namespace',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const { name } = await params
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} k8s namespaces delete ${name} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api(
      'DELETE',
      `/api/k8s/namespaces/${name}`,
      200,
      Date.now() - startTime,
    )
    return NextResponse.json({
      success: true,
      message: result.message ?? `Namespace ${name} deleted`,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to delete namespace', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete namespace',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
