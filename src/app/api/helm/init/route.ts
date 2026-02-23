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

    const args: string[] = ['helm', 'init']
    if (body.name) args.push(`--name=${body.name}`)
    if (body.output) args.push(`--output=${body.output}`)
    if (body.description) args.push(`--description=${body.description}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/init', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Helm chart created from compose',
      chartPath: result.chartPath,
      chartName: result.chartName ?? body.name,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to create helm chart', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create helm chart',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
