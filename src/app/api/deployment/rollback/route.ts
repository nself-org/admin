import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { environment, version, options = {} } = body

    const projectPath = getProjectPath()

    let command = ''

    if (version) {
      command = `nself rollback ${environment} ${version}`
    } else {
      command = `nself rollback ${environment}`
    }

    if (options.force) {
      command += ' --force'
    }

    if (options.skipChecks) {
      command += ' --skip-checks'
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      timeout: 300000,
    })

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Rollback failed',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
        stdout: err.stdout,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const environment = searchParams.get('environment') || 'staging'

    const projectPath = getProjectPath()

    const command = `nself history ${environment}`

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
    })

    return NextResponse.json({
      success: true,
      history: parseDeploymentHistory(stdout),
      stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get deployment history',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
      },
      { status: 500 },
    )
  }
}

function parseDeploymentHistory(output: string) {
  const deployments: Array<{
    version: string
    timestamp: string
    status: string
    commit?: string
  }> = []

  const lines = output.split('\n')
  for (const line of lines) {
    if (line.includes('deploy:')) {
      const match = line.match(/v(\S+)\s+(\S+)\s+(.*)/)
      if (match) {
        deployments.push({
          version: match[1],
          timestamp: match[2],
          status: match[3] || 'unknown',
        })
      }
    }
  }

  return deployments
}
