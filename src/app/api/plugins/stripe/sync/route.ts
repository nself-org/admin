/**
 * Stripe Sync API Route
 * POST: Trigger a sync from Stripe API via the nSelf Stripe plugin
 *
 * Delegates to: nself plugin stripe sync
 */

import { stripePluginInstalled } from '@/lib/hasura-client'
import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const installed = await stripePluginInstalled()

    if (!installed) {
      return NextResponse.json({
        success: false,
        pluginInstalled: false,
        error:
          'Stripe plugin not installed. Run: nself plugin install stripe',
      })
    }

    // Delegate sync to the nSelf CLI plugin system
    const result = await executeNselfCommand('plugin', [
      'stripe',
      'sync',
    ])

    if (!result.success) {
      logger.error('Stripe sync failed', { error: result.error })
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe sync failed',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    // Parse sync output if JSON
    let synced = {}
    try {
      const parsed = JSON.parse(result.stdout || '{}')
      synced = parsed.synced || parsed
    } catch {
      // Non-JSON output is fine
    }

    logger.api('POST', '/api/plugins/stripe/sync', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      pluginInstalled: true,
      message: 'Stripe data synced successfully',
      synced,
      output: result.stdout?.trim() || '',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to sync Stripe data', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync Stripe data',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
