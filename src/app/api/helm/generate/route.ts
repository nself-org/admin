import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const args: string[] = ['helm', 'generate']
    if (body.chart) args.push(`--chart=${body.chart}`)
    if (body.output) args.push(`--output=${body.output}`)
    if (body.services && Array.isArray(body.services)) {
      args.push(`--services=${body.services.join(',')}`)
    }
    if (body.includeIngress) args.push('--include-ingress')
    if (body.includeSecrets) args.push('--include-secrets')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/generate', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Helm chart files generated',
      files: result.files ?? [],
      chartPath: result.chartPath,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to generate helm chart files', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate helm chart files',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
