import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_POD_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
const SAFE_NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
const SAFE_CONTAINER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/
const SAFE_TAIL_PATTERN = /^[0-9]{1,6}$/
const SAFE_SINCE_PATTERN = /^[0-9]+[smhd]?$/

function validatePodName(input: string): boolean {
  return SAFE_POD_PATTERN.test(input) && !input.includes('..')
}

function validateNamespace(input: string): boolean {
  return SAFE_NAMESPACE_PATTERN.test(input) && !input.includes('..')
}

function validateContainer(input: string): boolean {
  return SAFE_CONTAINER_PATTERN.test(input) && !input.includes('..')
}

function validateTail(input: string): boolean {
  return SAFE_TAIL_PATTERN.test(input)
}

function validateSince(input: string): boolean {
  return SAFE_SINCE_PATTERN.test(input)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const { searchParams } = new URL(request.url)

    const pod = searchParams.get('pod')
    const namespace = searchParams.get('namespace')
    const container = searchParams.get('container')
    const tail = searchParams.get('tail') ?? '100'
    const since = searchParams.get('since')

    if (!pod) {
      return NextResponse.json(
        { success: false, error: 'Pod name is required' },
        { status: 400 },
      )
    }

    // Validate all inputs
    if (!validatePodName(pod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pod name' },
        { status: 400 },
      )
    }

    if (namespace && !validateNamespace(namespace)) {
      return NextResponse.json(
        { success: false, error: 'Invalid namespace' },
        { status: 400 },
      )
    }

    if (container && !validateContainer(container)) {
      return NextResponse.json(
        { success: false, error: 'Invalid container name' },
        { status: 400 },
      )
    }

    if (tail && !validateTail(tail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tail value' },
        { status: 400 },
      )
    }

    if (since && !validateSince(since)) {
      return NextResponse.json(
        { success: false, error: 'Invalid since value' },
        { status: 400 },
      )
    }

    const args: string[] = ['k8s', 'logs', pod]
    if (namespace) args.push(`--namespace=${namespace}`)
    if (container) args.push(`--container=${container}`)
    if (tail) args.push(`--tail=${tail}`)
    if (since) args.push(`--since=${since}`)
    args.push('--json')

    const { stdout } = await execFileAsync(nselfPath, args, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/k8s/logs', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      pod,
      container: container ?? 'default',
      logs: result.logs ?? stdout,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get pod logs', { error: err.message })
    return NextResponse.json(
      { success: false, error: 'Failed to get pod logs', details: err.message },
      { status: 500 },
    )
  }
}
