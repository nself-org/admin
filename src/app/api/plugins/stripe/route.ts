/**
 * Stripe Plugin API Route
 * GET: Fetch Stripe dashboard stats and counts from np_stripe_* tables via Hasura
 *
 * Requires the nSelf Stripe plugin to be installed (creates np_stripe_* tables).
 * Returns graceful fallback if plugin is not installed.
 */

import { hasuraQuery, stripePluginInstalled } from '@/lib/hasura-client'
import { logger } from '@/lib/logger'
import type { StripeStats } from '@/types/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Check if Stripe plugin is installed
    const installed = await stripePluginInstalled()

    if (!installed) {
      logger.api('GET', '/api/plugins/stripe', 200, Date.now() - startTime)
      return NextResponse.json({
        success: true,
        pluginInstalled: false,
        message:
          'Stripe plugin not installed. Run: nself plugin install stripe',
        stats: null,
        counts: null,
      })
    }

    // Query stats from np_stripe_* tables
    const result = await hasuraQuery<{
      customers_aggregate: { aggregate: { count: number } }
      subscriptions_aggregate: { aggregate: { count: number } }
      active_subscriptions_aggregate: { aggregate: { count: number } }
      invoices_aggregate: { aggregate: { count: number } }
      products_aggregate: { aggregate: { count: number } }
      revenue: {
        aggregate: { sum: { amount: number | null } }
      }
      recent_transactions: Array<{
        id: string
        amount: number
        currency: string
        customer_email: string
        status: string
        created_at: string
      }>
    }>(`query StripeStats {
      customers_aggregate: np_stripe_customers_aggregate {
        aggregate { count }
      }
      subscriptions_aggregate: np_stripe_subscriptions_aggregate {
        aggregate { count }
      }
      active_subscriptions_aggregate: np_stripe_subscriptions_aggregate(
        where: { status: { _eq: "active" } }
      ) {
        aggregate { count }
      }
      invoices_aggregate: np_stripe_invoices_aggregate {
        aggregate { count }
      }
      products_aggregate: np_stripe_products_aggregate {
        aggregate { count }
      }
      revenue: np_stripe_invoices_aggregate(
        where: { status: { _eq: "paid" } }
      ) {
        aggregate { sum { amount } }
      }
      recent_transactions: np_stripe_invoices(
        order_by: { created_at: desc }
        limit: 25
      ) {
        id
        amount
        currency
        customer_email
        status
        created_at
      }
    }`)

    if (result.errors) {
      // Table might exist but query failed - could be schema mismatch
      logger.warn('Stripe GraphQL query returned errors', {
        errors: result.errors,
      })
      return NextResponse.json({
        success: true,
        pluginInstalled: true,
        message: 'Stripe plugin tables found but query failed. Check schema.',
        stats: null,
        counts: null,
        errors: result.errors.map((e) => e.message),
      })
    }

    const data = result.data
    const totalRevenue = data?.revenue?.aggregate?.sum?.amount || 0
    const activeSubscriptions =
      data?.active_subscriptions_aggregate?.aggregate?.count || 0
    const totalCustomers =
      data?.customers_aggregate?.aggregate?.count || 0

    const stats: StripeStats = {
      mrr: Math.round(totalRevenue / 12),
      arr: totalRevenue,
      totalRevenue,
      activeSubscriptions,
      totalCustomers,
      churnRate: 0,
      revenueGrowth: 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    }

    const counts = {
      customers: totalCustomers,
      subscriptions:
        data?.subscriptions_aggregate?.aggregate?.count || 0,
      invoices: data?.invoices_aggregate?.aggregate?.count || 0,
      products: data?.products_aggregate?.aggregate?.count || 0,
    }

    const recentTransactions = (data?.recent_transactions || []).map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      customer: t.customer_email,
      status: t.status,
      created: t.created_at,
    }))

    logger.api('GET', '/api/plugins/stripe', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      pluginInstalled: true,
      stats,
      counts,
      recentTransactions,
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to fetch Stripe stats', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Stripe data',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
