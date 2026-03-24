/**
 * Stripe Invoices API Route
 * GET: Fetch paginated list of Stripe invoices from np_stripe_invoices via Hasura
 */

import { hasuraQuery, stripePluginInstalled } from '@/lib/hasura-client'
import { logger } from '@/lib/logger'
import type { StripeInvoice } from '@/types/stripe'
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
        invoices: [],
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
          { id: { _ilike: "%${search}%" } }
        ]`,
      )
    }
    const whereClause =
      conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : ''

    const result = await hasuraQuery<{
      invoices: Array<{
        id: string
        customer_id: string
        customer_email: string
        subscription_id: string | null
        status: string
        amount: number
        currency: string
        due_date: string | null
        paid_at: string | null
        created_at: string
        hosted_invoice_url: string | null
        invoice_pdf: string | null
      }>
      total: { aggregate: { count: number } }
    }>(`query StripeInvoices {
      invoices: np_stripe_invoices(
        ${whereClause}
        order_by: { created_at: desc }
        limit: ${pageSize}
        offset: ${offset}
      ) {
        id
        customer_id
        customer_email
        subscription_id
        status
        amount
        currency
        due_date
        paid_at
        created_at
        hosted_invoice_url
        invoice_pdf
      }
      total: np_stripe_invoices_aggregate(${whereClause}) {
        aggregate { count }
      }
    }`)

    if (result.errors) {
      logger.warn('Stripe invoices query failed', { errors: result.errors })
      return NextResponse.json({
        success: false,
        error: 'Failed to query invoices',
        details: result.errors[0]?.message,
      })
    }

    const invoices: StripeInvoice[] = (result.data?.invoices || []).map(
      (inv) => ({
        id: inv.id,
        customerId: inv.customer_id,
        customerEmail: inv.customer_email,
        subscriptionId: inv.subscription_id || undefined,
        status: inv.status as StripeInvoice['status'],
        amount: inv.amount,
        currency: inv.currency,
        dueDate: inv.due_date || undefined,
        paidAt: inv.paid_at || undefined,
        created: inv.created_at,
        hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
        invoicePdf: inv.invoice_pdf || undefined,
      }),
    )

    const total = result.data?.total?.aggregate?.count || 0

    logger.api(
      'GET',
      '/api/plugins/stripe/invoices',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      pluginInstalled: true,
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
