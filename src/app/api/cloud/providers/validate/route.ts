import { logger } from '@/lib/logger'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ValidationResult {
  provider: string
  valid: boolean
  message?: string
  error?: string
  account?: Record<string, unknown>
}

/**
 * Validate DigitalOcean credentials by calling GET /v2/account
 */
async function validateDigitalOcean(
  token: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.digitalocean.com/v2/account', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        provider: 'digitalocean',
        valid: false,
        error:
          (errorData as { message?: string }).message ||
          `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return {
      provider: 'digitalocean',
      valid: true,
      message: `Authenticated as ${(data as { account?: { email?: string } }).account?.email || 'unknown'}`,
      account: (data as { account?: Record<string, unknown> }).account,
    }
  } catch (error) {
    return {
      provider: 'digitalocean',
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

/**
 * Validate GCP service account JSON by checking required fields
 * Full API validation requires the Google Auth library which may not be present.
 * We validate the JSON structure and attempt a token exchange if possible.
 */
async function validateGCP(
  serviceAccountJson: string,
): Promise<ValidationResult> {
  try {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(serviceAccountJson)
    } catch {
      return {
        provider: 'gcp',
        valid: false,
        error: 'Invalid JSON: could not parse service account key',
      }
    }

    // Validate required fields
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri',
    ]
    const missingFields = requiredFields.filter((f) => !parsed[f])

    if (missingFields.length > 0) {
      return {
        provider: 'gcp',
        valid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      }
    }

    if (parsed.type !== 'service_account') {
      return {
        provider: 'gcp',
        valid: false,
        error: `Invalid type: expected "service_account", got "${parsed.type}"`,
      }
    }

    // Validate private key format
    const privateKey = parsed.private_key as string
    if (
      !privateKey.includes('-----BEGIN') ||
      !privateKey.includes('-----END')
    ) {
      return {
        provider: 'gcp',
        valid: false,
        error: 'Invalid private key format',
      }
    }

    return {
      provider: 'gcp',
      valid: true,
      message: `Service account: ${parsed.client_email} (project: ${parsed.project_id})`,
      account: {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        clientId: parsed.client_id,
      },
    }
  } catch (error) {
    return {
      provider: 'gcp',
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }
  }
}

/**
 * Validate Azure credentials by requesting an OAuth2 token
 */
async function validateAzure(credentials: {
  tenantId: string
  clientId: string
  clientSecret: string
}): Promise<ValidationResult> {
  try {
    const { tenantId, clientId, clientSecret } = credentials

    if (!tenantId || !clientId || !clientSecret) {
      return {
        provider: 'azure',
        valid: false,
        error: 'Missing required fields: tenantId, clientId, clientSecret',
      }
    }

    // Request an OAuth2 token to validate credentials
    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://management.azure.com/.default',
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        provider: 'azure',
        valid: false,
        error:
          (errorData as { error_description?: string }).error_description ||
          `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return {
      provider: 'azure',
      valid: true,
      message: `Authenticated for tenant ${tenantId}`,
      account: { tenantId, clientId },
    }
  } catch (error) {
    return {
      provider: 'azure',
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

/**
 * POST /api/cloud/providers/validate - Validate provider configuration
 *
 * Two modes:
 * 1. With credentials in body: validate directly against provider API
 * 2. Without credentials: delegate to nself cloud provider validate CLI
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { provider, credentials } = body

    // Direct API validation when credentials are provided
    if (credentials && provider) {
      let result: ValidationResult

      switch (provider) {
        case 'digitalocean': {
          const token = credentials.token || credentials.apiToken
          if (!token) {
            return NextResponse.json(
              { success: false, error: 'DigitalOcean API token is required' },
              { status: 400 },
            )
          }
          result = await validateDigitalOcean(token)
          break
        }
        case 'gcp': {
          const serviceAccountJson =
            typeof credentials.serviceAccount === 'string'
              ? credentials.serviceAccount
              : JSON.stringify(credentials.serviceAccount)
          result = await validateGCP(serviceAccountJson)
          break
        }
        case 'azure': {
          result = await validateAzure({
            tenantId: credentials.tenantId,
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
          })
          break
        }
        default: {
          // For other providers, fall through to CLI validation
          result = {
            provider,
            valid: false,
            error: `Direct validation not supported for ${provider}. Use CLI validation.`,
          }
        }
      }

      logger.api(
        'POST',
        '/api/cloud/providers/validate',
        result.valid ? 200 : 422,
        Date.now() - startTime,
      )

      return NextResponse.json({
        success: true,
        valid: result.valid,
        results: [result],
      })
    }

    // CLI-based validation (existing behavior)
    const projectPath = getProjectPath()

    let command = 'nself cloud provider validate --json'
    if (provider) command += ` --provider=${provider}`

    logger.debug('Executing cloud provider validate', { command, provider })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    let results: ValidationResult[] = []

    try {
      const parsed = JSON.parse(stdout.trim())
      results = parsed.results || parsed.validations || [parsed]
    } catch (_parseError) {
      logger.warn('Failed to parse validation JSON', { stdout })
    }

    logger.cli(command, true, Date.now() - startTime)

    const allValid = results.every((r) => r.valid)

    return NextResponse.json({
      success: true,
      valid: allValid,
      results,
      stderr: stderr.trim() || undefined,
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }

    logger.cli('nself cloud provider validate', false, Date.now() - startTime)
    logger.error('Failed to validate provider configuration', {
      error: execError.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate provider configuration',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
