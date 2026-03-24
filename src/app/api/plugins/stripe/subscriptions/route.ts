/**
 * Stripe Subscriptions API Route
 * GET: Fetch paginated list of Stripe subscriptions from np_stripe_subscriptions via Hasura
 */

import { hasuraQuery, stripePluginInstalled } from '@/lib/hasura-client'
import { logger } from '@/lib/logger'
import type { StripeSubscription } from '@/types/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const installed = await stripePluginInstalled()

    if (!installed) {
      return NextResponse.json({
        success: true,
        pluginInstalled: false,
        message:
          'Stripe plugin not installed. Run: nself plugin install stripe',
        subscriptions: [],
        total: 0,
      })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const offset = (page - 1) * pageSize

    // Build where clause
    const conditions: string[] = []
    if (status !== 'all') {
      conditions.push(`status: { _eq: "${status}" }`)
    }
    if (search) {
      conditions.push(
        `_or: [
          { customer_email: { _ilike: "%${search}%" } },
          { product_name: { _ilike: "%${search}%" } }
        ]`,
      )
    }
    const whereClause =
      conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : ''

    const result = await hasuraQuery<{
      subscriptions: Array<{
        id: string
        customer_id: string
        customer_email: string
        status: string
        price_id: string
        product_name: string
        amount: number
        currency: string
        interval: string
        current_period_start: string
        current_period_end: string
        cancel_at_period_end: boolean
        trial_end: string | null
        created_at: string
      }>
      total: { aggregate: { count: number } }
    }>(`query StripeSubscriptions {
      subscriptions: np_stripe_subscriptions(
        ${whereClause}
        order_by: { created_at: desc }
        limit: ${pageSize}
        offset: ${offset}
      ) {
        id
        customer_id
        customer_email
        status
        price_id
        product_name
        amount
        currency
        interval
        current_period_start
        current_period_end
        cancel_at_period_end
        trial_end
        created_at
      }
      total: np_stripe_subscriptions_aggregate(${whereClause}) {
        aggregate { count }
      }
    }`)

    if (result.errors) {
      logger.warn('Stripe subscriptions query failed', {
        errors: result.errors,
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to query subscriptions',
        details: result.errors[0]?.message,
      })
    }

    const subscriptions: StripeSubscription[] = (
      result.data?.subscriptions || []
    ).map((s) => ({
      id: s.id,
      customerId: s.customer_id,
      customerEmail: s.customer_email,
      status: s.status as StripeSubscription['status'],
      priceId: s.price_id,
      productName: s.product_name,
      amount: s.amount,
      currency: s.currency,
      interval: s.interval as StripeSubscription['interval'],
      currentPeriodStart: s.current_period_start,
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      trialEnd: s.trial_end || undefined,
      created: s.created_at,
    }))

    const total = result.data?.total?.aggregate?.count || 0

    logger.api(
      'GET',
      '/api/plugins/stripe/subscriptions',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      pluginInstalled: true,
      subscriptions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to fetch Stripe subscriptions', {
      error: err.message,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscriptions',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
