/**
 * Stripe Customers API Route
 * GET: Fetch paginated list of Stripe customers from np_stripe_customers via Hasura
 */

import { hasuraQuery, stripePluginInstalled } from '@/lib/hasura-client'
import { logger } from '@/lib/logger'
import type { StripeCustomer } from '@/types/stripe'
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
        customers: [],
        total: 0,
      })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * pageSize

    // Build where clause
    let whereClause = ''
    if (search) {
      whereClause = `where: {
        _or: [
          { email: { _ilike: "%${search}%" } },
          { name: { _ilike: "%${search}%" } }
        ]
      }`
    }

    const result = await hasuraQuery<{
      customers: Array<{
        id: string
        email: string
        name: string | null
        phone: string | null
        currency: string
        balance: number
        created_at: string
        metadata: Record<string, string> | null
        default_source: string | null
        subscription_count: number
      }>
      total: { aggregate: { count: number } }
    }>(`query StripeCustomers {
      customers: np_stripe_customers(
        ${whereClause}
        order_by: { created_at: desc }
        limit: ${pageSize}
        offset: ${offset}
      ) {
        id
        email
        name
        phone
        currency
        balance
        created_at
        metadata
        default_source
        subscription_count
      }
      total: np_stripe_customers_aggregate(${whereClause}) {
        aggregate { count }
      }
    }`)

    if (result.errors) {
      logger.warn('Stripe customers query failed', { errors: result.errors })
      return NextResponse.json({
        success: false,
        error: 'Failed to query customers',
        details: result.errors[0]?.message,
      })
    }

    const customers: StripeCustomer[] = (
      result.data?.customers || []
    ).map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name || undefined,
      phone: c.phone || undefined,
      currency: c.currency || 'usd',
      balance: c.balance || 0,
      created: c.created_at,
      metadata: c.metadata || undefined,
      defaultSource: c.default_source || undefined,
      subscriptionCount: c.subscription_count || 0,
    }))

    const total = result.data?.total?.aggregate?.count || 0

    logger.api(
      'GET',
      '/api/plugins/stripe/customers',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      pluginInstalled: true,
      customers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to fetch Stripe customers', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
