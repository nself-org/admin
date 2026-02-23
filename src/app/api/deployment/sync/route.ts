import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { source, target, options = {} } = body

    const projectPath = getProjectPath()

    let command = `nself sync ${source} ${target}`

    if (options.code) {
      command += ' --code'
    }

    if (options.database) {
      command += ' --database'
    }

    if (options.files) {
      command += ' --files'
    }

    if (options.env) {
      command += ' --env'
    }

    if (options.dryRun) {
      command += ' --dry-run'
    }

    if (options.force) {
      command += ' --force'
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
        error: 'Sync failed',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
        stdout: err.stdout,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || 'staging'
    const target = searchParams.get('target') || 'production'

    const projectPath = getProjectPath()

    const command = `nself sync ${source} ${target} --dry-run --diff`

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
    })

    return NextResponse.json({
      success: true,
      diff: stdout,
      changes: parseChanges(stdout),
      stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync diff',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
      },
      { status: 500 },
    )
  }
}

function parseChanges(output: string) {
  const changes = {
    code: 0,
    database: 0,
    files: 0,
    env: 0,
  }

  const lines = output.split('\n')
  for (const line of lines) {
    if (line.includes('code:')) {
      const match = line.match(/code:\s+(\d+)/)
      if (match) changes.code = parseInt(match[1], 10)
    } else if (line.includes('database:')) {
      const match = line.match(/database:\s+(\d+)/)
      if (match) changes.database = parseInt(match[1], 10)
    } else if (line.includes('files:')) {
      const match = line.match(/files:\s+(\d+)/)
      if (match) changes.files = parseInt(match[1], 10)
    } else if (line.includes('env:')) {
      const match = line.match(/env:\s+(\d+)/)
      if (match) changes.env = parseInt(match[1], 10)
    }
  }

  return changes
}
