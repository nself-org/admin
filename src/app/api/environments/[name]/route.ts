import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/
const SAFE_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,253}$/
const SAFE_REPLICAS_PATTERN = /^[0-9]{1,3}$/
const SAFE_ENV_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,126}$/

function validateSafeName(input: string): boolean {
  return SAFE_NAME_PATTERN.test(input) && !input.includes('..')
}

function validateDomain(input: string): boolean {
  return SAFE_DOMAIN_PATTERN.test(input) && !input.includes('..')
}

function validateReplicas(input: string): boolean {
  return SAFE_REPLICAS_PATTERN.test(input)
}

function validateEnvKey(input: string): boolean {
  return SAFE_ENV_KEY_PATTERN.test(input)
}

function validateEnvValue(input: string): boolean {
  // Environment values can be permissive but must avoid shell metacharacters
  return (
    typeof input === 'string' &&
    input.length <= 4096 &&
    !/[;&|`$(){}[\]<>\\]/.test(input)
  )
}

interface RouteParams {
  params: Promise<{ name: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const { name } = await params

    // Validate name parameter
    if (!validateSafeName(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment name' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execFileAsync(
      nselfPath,
      ['deploy', 'environments', name, '--json'],
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', `/api/environments/${name}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      environment: {
        name,
        ...result.environment,
      },
      config: result.config ?? {},
      status: result.status ?? 'unknown',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get environment config', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get environment config',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const { name } = await params

    // Validate name parameter
    if (!validateSafeName(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment name' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    // Validate domain if provided
    if (body.domain && !validateDomain(body.domain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid domain' },
        { status: 400 },
      )
    }

    // Validate replicas if provided
    if (body.replicas !== undefined) {
      const replicasStr = String(body.replicas)
      if (!validateReplicas(replicasStr)) {
        return NextResponse.json(
          { success: false, error: 'Invalid replicas value' },
          { status: 400 },
        )
      }
    }

    // Validate env vars if provided
    if (body.env && typeof body.env === 'object') {
      for (const [key, value] of Object.entries(body.env)) {
        if (!validateEnvKey(key)) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid environment variable key: ${key}`,
            },
            { status: 400 },
          )
        }
        if (typeof value === 'string' && !validateEnvValue(value)) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid environment variable value for: ${key}`,
            },
            { status: 400 },
          )
        }
      }
    }

    const args: string[] = ['deploy', 'environments', 'configure', name]

    if (body.domain) args.push(`--domain=${body.domain}`)
    if (body.replicas !== undefined) args.push(`--replicas=${body.replicas}`)
    if (body.resources) {
      // Validate resources is a simple object with safe values
      const resourcesJson = JSON.stringify(body.resources)
      if (
        resourcesJson.length <= 1024 &&
        !/[;&|`$(){}[\]<>\\]/.test(resourcesJson)
      ) {
        args.push(`--resources=${resourcesJson}`)
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid resources configuration' },
          { status: 400 },
        )
      }
    }
    if (body.env && typeof body.env === 'object') {
      Object.entries(body.env).forEach(([key, value]) => {
        args.push(`--env=${key}=${value}`)
      })
    }
    args.push('--json')

    const { stdout } = await execFileAsync(nselfPath, args, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('PUT', `/api/environments/${name}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Environment ${name} updated`,
      environment: name,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to update environment config', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update environment config',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
