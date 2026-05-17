import { setConfig } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

const REQUIRED_SA_FIELDS = [
  'type',
  'project_id',
  'private_key_id',
  'private_key',
  'client_email',
  'client_id',
  'auth_uri',
  'token_uri',
] as const

/**
 * Validate a GCP service account JSON by checking required fields,
 * type assertion, and private key format.
 * Returns {valid, projectId?, clientEmail?, error?}.
 */
function validateGCPServiceAccount(serviceAccountJson: string): {
  valid: boolean
  projectId?: string
  clientEmail?: string
  error?: string
} {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(serviceAccountJson)
  } catch {
    return { valid: false, error: 'Invalid JSON: could not parse service account key' }
  }

  const missingFields = REQUIRED_SA_FIELDS.filter((f) => !parsed[f])
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    }
  }

  if (parsed.type !== 'service_account') {
    return {
      valid: false,
      error: `Invalid type: expected "service_account", got "${parsed.type}"`,
    }
  }

  const privateKey = parsed.private_key as string
  if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
    return { valid: false, error: 'Invalid private key format' }
  }

  return {
    valid: true,
    projectId: parsed.project_id as string,
    clientEmail: parsed.client_email as string,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { projectId, serviceAccountKey } = await request.json()

    if (!projectId || !serviceAccountKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      )
    }

    const serviceAccountJson =
      typeof serviceAccountKey === 'string'
        ? serviceAccountKey
        : JSON.stringify(serviceAccountKey)

    const result = validateGCPServiceAccount(serviceAccountJson)

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'GCP service account validation failed',
          configured: false,
        },
        { status: 422 },
      )
    }

    await setConfig('cloud_gcp_credentials', {
      provider: 'gcp',
      projectId: result.projectId || projectId,
      clientEmail: result.clientEmail,
      configuredAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      configured: true,
      message: `Connected to GCP project ${result.projectId || projectId}`,
      projectId: result.projectId || projectId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to GCP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
