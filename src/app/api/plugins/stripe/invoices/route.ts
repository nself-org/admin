/**
 * Stripe Invoices API Route
 * GET: Fetch paginated list of Stripe invoices
 */

import { logger } from '@/lib/logger'
import type { StripeInvoice } from '@/types/stripe'
import { NextRequest, NextResponse } from 'next/server'

// Mock invoice data generator
function generateMockInvoices(count: number): StripeInvoice[] {
  const invoices: StripeInvoice[] = []
  const statuses: StripeInvoice['status'][] = [
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'open',
    'draft',
  ]

  for (let i = 0; i < count; i++) {
    const created = new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const status = statuses[i % statuses.length]
    const dueDate =
      status === 'open'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined
    const paidAt =
      status === 'paid'
        ? new Date(
            new Date(created).getTime() +
              Math.random() * 7 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : undefined

    invoices.push({
      id: `in_${Math.random().toString(36).substring(2, 15)}`,
      customerId: `cus_${Math.random().toString(36).substring(2, 15)}`,
      customerEmail: `customer${i}@example.com`,
      subscriptionId:
        Math.random() > 0.3
          ? `sub_${Math.random().toString(36).substring(2, 15)}`
          : undefined,
      status,
      amount: Math.floor(Math.random() * 50000) + 1000, // $10 to $500
      currency: 'usd',
      dueDate,
      paidAt,
      created,
      hostedInvoiceUrl: `https://invoice.stripe.com/i/acct_xxx/invoice_xxx`,
      invoicePdf: `https://pay.stripe.com/invoice/acct_xxx/pdf`,
    })
  }

  return invoices.sort(
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
    const allInvoices = generateMockInvoices(342)

    // Filter by search query and status
    let filteredInvoices = allInvoices
    if (search) {
      const query = search.toLowerCase()
      filteredInvoices = allInvoices.filter(
        (inv) =>
          inv.customerEmail.toLowerCase().includes(query) ||
          inv.id.toLowerCase().includes(query),
      )
    }
    if (status !== 'all') {
      filteredInvoices = filteredInvoices.filter((inv) => inv.status === status)
    }

    const total = filteredInvoices.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const invoices = filteredInvoices.slice(start, end)

    logger.api(
      'GET',
      '/api/plugins/stripe/invoices',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to fetch Stripe invoices', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch invoices',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
