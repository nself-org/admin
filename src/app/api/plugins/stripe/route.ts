/**
 * Stripe Plugin API Route
 * GET: Fetch Stripe dashboard stats and counts
 *
 * IMPORTANT: This is a DEMO/PREVIEW implementation with mock data.
 * Real Stripe integration requires:
 * 1. Stripe API key configuration
 * 2. Stripe SDK integration
 * 3. Webhook handlers for real-time sync
 * 4. Database storage for cached data
 */

import { logger } from '@/lib/logger'
import type { StripeStats } from '@/types/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // DEMO DATA - Replace with Stripe API calls for production use
    const stats: StripeStats = {
      mrr: 125000, // $1,250.00 in cents
      arr: 1500000, // $15,000.00 in cents
      totalRevenue: 3450000, // $34,500.00 in cents
      activeSubscriptions: 24,
      totalCustomers: 156,
      churnRate: 3.2,
      revenueGrowth: 12.4,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    }

    const counts = {
      customers: 156,
      subscriptions: 24,
      invoices: 342,
      products: 8,
    }

    // Generate mock revenue chart data for last 12 months
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const currentMonth = new Date().getMonth()
    const revenueChart = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = (currentMonth - 11 + i + 12) % 12
      return {
        month: months[monthIndex],
        revenue: Math.floor(Math.random() * 50000) + 100000, // $1000-$1500
      }
    })

    // Generate mock recent transactions
    const recentTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `ch_${Math.random().toString(36).substring(2, 15)}`,
      amount: Math.floor(Math.random() * 50000) + 1000,
      currency: 'usd',
      customer: `customer${i + 1}@example.com`,
      status: i < 20 ? 'succeeded' : 'pending',
      created: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    }))

    logger.api('GET', '/api/plugins/stripe', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      stats,
      counts,
      revenueChart,
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
