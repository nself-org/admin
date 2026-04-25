import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,52}$/
const SAFE_CHART_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-./]{0,254}$/
const SAFE_NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
const SAFE_VALUES_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-./]{0,254}$/
const SAFE_SET_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.\-[\]]{0,126}$/
const SAFE_TIMEOUT_PATTERN = /^[0-9]+[smh]?$/

function validateReleaseName(input: string): boolean {
  return SAFE_NAME_PATTERN.test(input) && !input.includes('..')
}

function validateChart(input: string): boolean {
  return (
    SAFE_CHART_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.includes('//')
  )
}

function validateNamespace(input: string): boolean {
  return SAFE_NAMESPACE_PATTERN.test(input) && !input.includes('..')
}

function validateValuesPath(input: string): boolean {
  return (
    SAFE_VALUES_PATH_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.startsWith('/')
  )
}

function validateSetKey(input: string): boolean {
  return SAFE_SET_KEY_PATTERN.test(input)
}

function validateSetValue(input: string): boolean {
  // Set values can be more permissive but still need to avoid shell metacharacters
  return (
    typeof input === 'string' &&
    input.length <= 1024 &&
    !/[;&|`$(){}[\]<>\\]/.test(input)
  )
}

function validateTimeout(input: string): boolean {
  return SAFE_TIMEOUT_PATTERN.test(input)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { name, chart, namespace, values, set, dryRun, wait, timeout } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Release name is required' },
        { status: 400 },
      )
    }

    if (!chart) {
      return NextResponse.json(
        { success: false, error: 'Chart is required' },
        { status: 400 },
      )
    }

    // Validate all inputs
    if (!validateReleaseName(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid release name' },
        { status: 400 },
      )
    }

    if (!validateChart(chart)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chart name' },
        { status: 400 },
      )
    }

    if (namespace && !validateNamespace(namespace)) {
      return NextResponse.json(
        { success: false, error: 'Invalid namespace' },
        { status: 400 },
      )
    }

    if (values && !validateValuesPath(values)) {
      return NextResponse.json(
        { success: false, error: 'Invalid values file path' },
        { status: 400 },
      )
    }

    if (timeout && !validateTimeout(timeout)) {
      return NextResponse.json(
        { success: false, error: 'Invalid timeout value' },
        { status: 400 },
      )
    }

    // Validate set values if provided
    if (set && typeof set === 'object') {
      for (const [key, value] of Object.entries(set)) {
        if (!validateSetKey(key)) {
          return NextResponse.json(
            { success: false, error: `Invalid set key: ${key}` },
            { status: 400 },
          )
        }
        if (typeof value === 'string' && !validateSetValue(value)) {
          return NextResponse.json(
            { success: false, error: `Invalid set value for key: ${key}` },
            { status: 400 },
          )
        }
      }
    }

    const args: string[] = ['helm', 'install', name, chart]
    if (namespace) args.push(`--namespace=${namespace}`)
    if (values) args.push(`--values=${values}`)
    if (set && typeof set === 'object') {
      Object.entries(set).forEach(([key, value]) => {
        args.push(`--set=${key}=${value}`)
      })
    }
    if (dryRun) args.push('--dry-run')
    if (wait) args.push('--wait')
    if (timeout) args.push(`--timeout=${timeout}`)
    args.push('--json')

    const { stdout } = await execFileAsync(nselfPath, args, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 600000,
    })

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/install', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Release ${name} installed`,
      release: name,
      namespace: namespace ?? 'default',
      status: result.status,
      revision: result.revision ?? 1,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to install helm release', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to install helm release',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
