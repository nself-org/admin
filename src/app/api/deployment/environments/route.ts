import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()

    const { stdout } = await execAsync('nself env list', {
      cwd: projectPath,
    })

    return NextResponse.json({
      success: true,
      output: stdout,
      environments: parseEnvironments(stdout),
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list environments',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, environment, options = {} } = body

    const projectPath = getProjectPath()

    let command = ''

    switch (action) {
      case 'create':
        command = `nself env create ${environment}`
        if (options.template) {
          command += ` --template=${options.template}`
        }
        break

      case 'delete':
        command = `nself env delete ${environment}`
        if (options.force) {
          command += ' --force'
        }
        break

      case 'switch':
        command = `nself env switch ${environment}`
        break

      case 'validate':
        command = `nself env validate ${environment}`
        break

      case 'diff':
        command = `nself env diff ${environment} ${options.compare}`
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 },
        )
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
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
        error: 'Environment operation failed',
        details: err.message || 'Unknown error',
        stderr: err.stderr,
        stdout: err.stdout,
      },
      { status: 500 },
    )
  }
}

function parseEnvironments(output: string) {
  const environments: Array<{
    name: string
    type: string
    active: boolean
    hasEnv: boolean
    hasSecrets: boolean
  }> = []

  const lines = output.split('\n')
  for (const line of lines) {
    if (line.includes('env:')) {
      const match = line.match(/(\w+)\s+\((.*?)\)/)
      if (match) {
        environments.push({
          name: match[1],
          type: match[2] || 'custom',
          active: line.includes('*'),
          hasEnv: line.includes('.env'),
          hasSecrets: line.includes('.env.secrets'),
        })
      }
    }
  }

  return environments
}
