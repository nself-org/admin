/**
 * Stripe Subscriptions API Route
 * GET: Fetch paginated list of Stripe subscriptions
 */

import { logger } from '@/lib/logger'
import type { StripeSubscription } from '@/types/stripe'
import { NextRequest, NextResponse } from 'next/server'

// Mock subscription data generator
function generateMockSubscriptions(count: number): StripeSubscription[] {
  const subscriptions: StripeSubscription[] = []
  const products = [
    'Starter Plan',
    'Professional Plan',
    'Enterprise Plan',
    'Basic Plan',
  ]
  const statuses: StripeSubscription['status'][] = [
    'active',
    'active',
    'active',
    'active',
    'trialing',
    'canceled',
    'past_due',
  ]
  const intervals: StripeSubscription['interval'][] = [
    'month',
    'month',
    'month',
    'year',
  ]

  for (let i = 0; i < count; i++) {
    const created = new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const currentPeriodStart = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const interval = intervals[i % intervals.length]
    const periodDays = interval === 'year' ? 365 : 30
    const currentPeriodEnd = new Date(
      new Date(currentPeriodStart).getTime() + periodDays * 24 * 60 * 60 * 1000,
    ).toISOString()

    subscriptions.push({
      id: `sub_${Math.random().toString(36).substring(2, 15)}`,
      customerId: `cus_${Math.random().toString(36).substring(2, 15)}`,
      customerEmail: `customer${i}@example.com`,
      status: statuses[i % statuses.length],
      priceId: `price_${Math.random().toString(36).substring(2, 15)}`,
      productName: products[i % products.length],
      amount: interval === 'year' ? 99900 : 999, // $999/yr or $9.99/mo
      currency: 'usd',
      interval,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: Math.random() > 0.9,
      created,
    })
  }

  return subscriptions.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    // Generate mock data
    const allSubscriptions = generateMockSubscriptions(24)

    // Filter by search query and status
    let filteredSubscriptions = allSubscriptions
    if (search) {
      const query = search.toLowerCase()
      filteredSubscriptions = allSubscriptions.filter(
        (sub) =>
          sub.customerEmail.toLowerCase().includes(query) ||
          sub.productName.toLowerCase().includes(query),
      )
    }
    if (status !== 'all') {
      filteredSubscriptions = filteredSubscriptions.filter(
        (sub) => sub.status === status,
      )
    }

    const total = filteredSubscriptions.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const subscriptions = filteredSubscriptions.slice(start, end)

    logger.api(
      'GET',
      '/api/plugins/stripe/subscriptions',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
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
