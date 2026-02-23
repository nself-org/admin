/**
 * Stripe Customers API Route
 * GET: Fetch paginated list of Stripe customers
 */

import { logger } from '@/lib/logger'
import type { StripeCustomer } from '@/types/stripe'
import { NextRequest, NextResponse } from 'next/server'

// Mock customer data generator
function generateMockCustomers(count: number): StripeCustomer[] {
  const customers: StripeCustomer[] = []
  const names = [
    'John Smith',
    'Jane Doe',
    'Robert Johnson',
    'Emily Davis',
    'Michael Brown',
    'Sarah Wilson',
    'David Martinez',
    'Lisa Anderson',
    'James Taylor',
    'Jennifer Thomas',
  ]
  const domains = ['gmail.com', 'yahoo.com', 'company.com', 'startup.io']

  for (let i = 0; i < count; i++) {
    const name = names[i % names.length]
    const email = `${name.toLowerCase().replace(' ', '.')}${i > 9 ? i : ''}@${domains[i % domains.length]}`
    const created = new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
    ).toISOString()

    customers.push({
      id: `cus_${Math.random().toString(36).substring(2, 15)}`,
      email,
      name,
      phone: Math.random() > 0.5 ? '+1-555-0100' : undefined,
      currency: 'usd',
      balance: Math.floor(Math.random() * 100000) - 50000, // -$500 to $500
      created,
      subscriptionCount: Math.floor(Math.random() * 3),
    })
  }

  return customers.sort(
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

    // Generate mock data
    const allCustomers = generateMockCustomers(156)

    // Filter by search query
    let filteredCustomers = allCustomers
    if (search) {
      const query = search.toLowerCase()
      filteredCustomers = allCustomers.filter(
        (customer) =>
          customer.email.toLowerCase().includes(query) ||
          customer.name?.toLowerCase().includes(query),
      )
    }

    const total = filteredCustomers.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const customers = filteredCustomers.slice(start, end)

    logger.api(
      'GET',
      '/api/plugins/stripe/customers',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
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
