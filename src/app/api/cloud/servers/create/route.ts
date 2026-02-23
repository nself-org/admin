import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import type { ServerProvisionRequest } from '@/types/cloud'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Strict validation patterns for safe inputs
const SAFE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/
const SAFE_PROVIDER_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,30}$/
const SAFE_SIZE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$/
const SAFE_REGION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,30}$/
const SAFE_IMAGE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,126}$/
const SAFE_SSH_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/
const SAFE_TAG_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/
const SAFE_TAG_VALUE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-. ]{0,126}$/

function validateSafeName(input: string): boolean {
  return SAFE_NAME_PATTERN.test(input) && !input.includes('..')
}

function validateProvider(input: string): boolean {
  return SAFE_PROVIDER_PATTERN.test(input)
}

function validateSize(input: string): boolean {
  return SAFE_SIZE_PATTERN.test(input)
}

function validateRegion(input: string): boolean {
  return SAFE_REGION_PATTERN.test(input)
}

function validateImage(input: string): boolean {
  return (
    SAFE_IMAGE_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.startsWith('/')
  )
}

function validateSshKeyId(input: string): boolean {
  return SAFE_SSH_KEY_PATTERN.test(input)
}

function validateTagKey(input: string): boolean {
  return SAFE_TAG_KEY_PATTERN.test(input)
}

function validateTagValue(input: string): boolean {
  return SAFE_TAG_VALUE_PATTERN.test(input)
}

/**
 * POST /api/cloud/servers/create - Provision a new server
 * Executes: nself cloud server create {provider} --name {name} --size {size} --region {region}
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const body: ServerProvisionRequest = await request.json()
    const { provider, name, region, size, sshKeyId, image, tags } = body
    const projectPath = getProjectPath()

    // Validate required fields
    if (!provider || !name || !region || !size) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'provider, name, region, and size are required',
        },
        { status: 400 },
      )
    }

    // Validate all inputs
    if (!validateProvider(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider name' },
        { status: 400 },
      )
    }

    if (!validateSafeName(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid server name' },
        { status: 400 },
      )
    }

    if (!validateRegion(region)) {
      return NextResponse.json(
        { success: false, error: 'Invalid region' },
        { status: 400 },
      )
    }

    if (!validateSize(size)) {
      return NextResponse.json(
        { success: false, error: 'Invalid size' },
        { status: 400 },
      )
    }

    if (sshKeyId && !validateSshKeyId(sshKeyId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid SSH key ID' },
        { status: 400 },
      )
    }

    if (image && !validateImage(image)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image name' },
        { status: 400 },
      )
    }

    // Validate tags if provided
    if (tags && typeof tags === 'object') {
      for (const [key, value] of Object.entries(tags)) {
        if (!validateTagKey(key)) {
          return NextResponse.json(
            { success: false, error: `Invalid tag key: ${key}` },
            { status: 400 },
          )
        }
        if (typeof value === 'string' && !validateTagValue(value)) {
          return NextResponse.json(
            { success: false, error: `Invalid tag value for key: ${key}` },
            { status: 400 },
          )
        }
      }
    }

    // Build the args array
    const execArgs: string[] = [
      'cloud',
      'server',
      'create',
      provider,
      `--name=${name}`,
      `--size=${size}`,
      `--region=${region}`,
    ]

    if (sshKeyId) execArgs.push(`--ssh-key=${sshKeyId}`)
    if (image) execArgs.push(`--image=${image}`)
    if (tags && Object.keys(tags).length > 0) {
      const tagStr = Object.entries(tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')
      execArgs.push(`--tags=${tagStr}`)
    }

    logger.debug('Executing cloud server create', { provider, name })

    const { stdout, stderr } = await execFileAsync('nself', execArgs, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 300000, // 5 minute timeout for provisioning
    })

    let server = null

    try {
      const parsed = JSON.parse(stdout.trim())
      server = parsed.server || parsed || null
    } catch (_parseError) {
      // Not JSON, just return raw output
      logger.debug('Server create output is not JSON', { stdout })
    }

    logger.cli('nself cloud server create', true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      message: `Server ${name} is being provisioned`,
      server,
      output: stdout.trim(),
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli('nself cloud server create', false, Date.now() - startTime)
    logger.error('Failed to create cloud server', {
      error: execError.message,
      stderr: execError.stderr,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create cloud server',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
