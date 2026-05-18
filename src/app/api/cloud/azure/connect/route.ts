import { setConfig } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validate Azure credentials by requesting an OAuth2 token.
 * Returns {valid, tenantId, clientId, error?}.
 */
async function validateAzureCredentials(credentials: {
  tenantId: string
  clientId: string
  clientSecret: string
}): Promise<{ valid: boolean; error?: string }> {
  const { tenantId, clientId, clientSecret } = credentials

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
      valid: false,
      error:
        (errorData as { error_description?: string }).error_description ||
        `HTTP ${response.status}: ${response.statusText}`,
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { subscriptionId, clientId, clientSecret, tenantId } = await request.json()

    if (!subscriptionId || !clientId || !clientSecret || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await validateAzureCredentials({
      tenantId,
      clientId,
      clientSecret,
    })

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Azure credential validation failed',
          configured: false,
        },
        { status: 422 }
      )
    }

    await setConfig('cloud_azure_credentials', {
      provider: 'azure',
      subscriptionId,
      tenantId,
      clientId,
      configuredAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      configured: true,
      message: `Connected to Azure for tenant ${tenantId}`,
      subscriptionId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to Azure',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
