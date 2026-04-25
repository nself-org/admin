import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} deploy preview list --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/deploy/preview', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      previews: result.previews ?? [],
      active: result.active ?? 0,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list preview environments', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list preview environments',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { branch, name, prNumber, ttl, autoDestroy } = body

    const args: string[] = ['deploy', 'preview', 'create']
    if (branch) args.push(`--branch=${branch}`)
    if (name) args.push(`--name=${name}`)
    if (prNumber) args.push(`--pr=${prNumber}`)
    if (ttl) args.push(`--ttl=${ttl}`)
    if (autoDestroy !== undefined)
      args.push(autoDestroy ? '--auto-destroy' : '--no-auto-destroy')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 300000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/deploy/preview', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Preview environment created',
      preview: {
        name: result.name ?? name,
        url: result.url,
        branch: result.branch ?? branch,
        expiresAt: result.expiresAt,
      },
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to create preview environment', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create preview environment',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const { searchParams } = new URL(request.url)

    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Preview name is required' },
        { status: 400 },
      )
    }

    const { stdout } = await execAsync(
      `${nselfPath} deploy preview destroy ${name} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 180000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('DELETE', '/api/deploy/preview', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Preview environment ${name} destroyed`,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to destroy preview environment', {
      error: err.message,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to destroy preview environment',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
