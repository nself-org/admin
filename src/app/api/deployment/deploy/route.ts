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
    const { environment, options = {} } = body

    const projectPath = getProjectPath()

    let command = ''

    switch (environment) {
      case 'staging':
        command = 'nself staging deploy'
        break

      case 'production':
        command = 'nself prod deploy'
        break

      case 'development':
        command = 'nself start'
        break

      default:
        command = `nself deploy ${environment}`
    }

    if (options.dryRun) {
      command += ' --dry-run'
    }

    if (options.force) {
      command += ' --force'
    }

    if (options.rolling) {
      command += ' --rolling'
    }

    if (options.branch) {
      command += ` --branch=${options.branch}`
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      timeout: 600000,
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
        error: 'Deployment failed',
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

    let command = ''

    switch (environment) {
      case 'staging':
        command = 'nself staging status'
        break

      case 'production':
        command = 'nself prod status'
        break

      default:
        command = 'nself status'
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
    })

    return NextResponse.json({
      success: true,
      status: stdout,
      stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get deployment status',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
      },
      { status: 500 },
    )
  }
}
