import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/

function validateSafeName(input: string): boolean {
  return SAFE_NAME_PATTERN.test(input) && !input.includes('..')
}

// Allowed templates for environment creation
const ALLOWED_TEMPLATES = ['local', 'staging', 'production', 'custom', 'dev']

interface Environment {
  name: string
  type: 'local' | 'staging' | 'production' | 'custom'
  hasEnv: boolean
  hasSecrets: boolean
  hasServer: boolean
  serverConfig?: {
    host?: string
    port?: number
    user?: string
    deployPath?: string
  }
  isCurrent: boolean
}

// GET /api/env - List all environments
export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const environmentsDir = path.join(projectPath, '.environments')

    const environments: Environment[] = []

    // Check if .environments directory exists
    try {
      const envDirs = await fs.readdir(environmentsDir)

      for (const envName of envDirs) {
        const envPath = path.join(environmentsDir, envName)
        const stat = await fs.stat(envPath)

        if (!stat.isDirectory()) continue

        // Check for required files
        const hasEnv = await fs
          .access(path.join(envPath, '.env'))
          .then(() => true)
          .catch(() => false)

        const hasSecrets = await fs
          .access(path.join(envPath, '.env.secrets'))
          .then(() => true)
          .catch(() => false)

        const hasServer = await fs
          .access(path.join(envPath, 'server.json'))
          .then(() => true)
          .catch(() => false)

        // Read server config if exists
        let serverConfig
        if (hasServer) {
          try {
            const serverJson = await fs.readFile(
              path.join(envPath, 'server.json'),
              'utf-8',
            )
            serverConfig = JSON.parse(serverJson)
          } catch {
            // Invalid JSON, skip
          }
        }

        // Determine environment type
        let type: Environment['type'] = 'custom'
        if (envName === 'dev' || envName === 'local') type = 'local'
        else if (envName === 'staging') type = 'staging'
        else if (envName === 'prod' || envName === 'production')
          type = 'production'

        environments.push({
          name: envName,
          type,
          hasEnv,
          hasSecrets,
          hasServer,
          serverConfig: serverConfig
            ? {
                host: serverConfig.host,
                port: serverConfig.port,
                user: serverConfig.user,
                deployPath: serverConfig.deploy_path,
              }
            : undefined,
          isCurrent: false,
        })
      }
    } catch {
      // .environments directory doesn't exist
    }

    // Check current environment
    try {
      const currentEnvPath = path.join(projectPath, '.current-env')
      const currentEnv = await fs.readFile(currentEnvPath, 'utf-8')
      const current = currentEnv.trim()
      environments.forEach((env) => {
        if (env.name === current) {
          env.isCurrent = true
        }
      })
    } catch {
      // No current env file, default to 'dev'
      environments.forEach((env) => {
        if (env.name === 'dev') {
          env.isCurrent = true
        }
      })
    }

    // Also try nself env list command
    try {
      const { stdout } = await execFileAsync('nself', ['env', 'list'], {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 10000,
      })

      return NextResponse.json({
        success: true,
        environments,
        cliOutput: stdout.trim(),
        projectPath,
      })
    } catch {
      // CLI command failed, return what we found
      return NextResponse.json({
        success: true,
        environments,
        projectPath,
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list environments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/env - Execute environment commands
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, name, template, force } = body
    const projectPath = getProjectPath()

    // Validate name if provided
    if (name && typeof name === 'string' && !validateSafeName(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment name' },
        { status: 400 },
      )
    }

    // Validate template if provided
    if (
      template &&
      typeof template === 'string' &&
      !ALLOWED_TEMPLATES.includes(template)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid template name' },
        { status: 400 },
      )
    }

    const execArgs: string[] = ['env']

    switch (action) {
      case 'create': {
        if (!name) {
          return NextResponse.json(
            { success: false, error: 'Name is required for create action' },
            { status: 400 },
          )
        }
        execArgs.push('create', name, template || 'local')
        if (force) execArgs.push('--force')
        break
      }
      case 'switch': {
        if (!name) {
          return NextResponse.json(
            { success: false, error: 'Name is required for switch action' },
            { status: 400 },
          )
        }
        execArgs.push('switch', name)
        break
      }
      case 'delete': {
        if (!name) {
          return NextResponse.json(
            { success: false, error: 'Name is required for delete action' },
            { status: 400 },
          )
        }
        execArgs.push('delete', name)
        if (force) execArgs.push('--force')
        break
      }
      case 'validate': {
        execArgs.push('validate')
        if (name) execArgs.push(name)
        break
      }
      case 'status': {
        execArgs.push('status')
        break
      }
      case 'info': {
        execArgs.push('info')
        if (name) execArgs.push(name)
        break
      }
      case 'diff': {
        const { env1, env2, values } = body
        if (!env1 || !env2) {
          return NextResponse.json(
            {
              success: false,
              error: 'env1 and env2 are required for diff action',
            },
            { status: 400 },
          )
        }
        if (!validateSafeName(env1) || !validateSafeName(env2)) {
          return NextResponse.json(
            { success: false, error: 'Invalid environment names for diff' },
            { status: 400 },
          )
        }
        execArgs.push('diff', env1, env2)
        if (values) execArgs.push('--values')
        break
      }
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }

    const { stdout, stderr } = await execFileAsync('nself', execArgs, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      action,
      output: stdout.trim(),
      stderr: stderr.trim(),
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute environment command',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
