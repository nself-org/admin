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

    const { name, revision, namespace, dryRun, wait, timeout } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Release name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'rollback', name]
    if (revision) args.push(String(revision))
    if (namespace) args.push(`--namespace=${namespace}`)
    if (dryRun) args.push('--dry-run')
    if (wait) args.push('--wait')
    if (timeout) args.push(`--timeout=${timeout}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 300000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/rollback', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Release ${name} rolled back`,
      release: name,
      revision: revision ?? 'previous',
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to rollback helm release', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rollback helm release',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
