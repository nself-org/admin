/**
 * Stripe Plugin Types for nself-admin v0.0.8
 */

export interface StripeCustomer {
  id: string
  email: string
  name?: string
  phone?: string
  currency: string
  balance: number
  created: string
  metadata?: Record<string, string>
  defaultSource?: string
  subscriptionCount: number
}

export interface StripeSubscription {
  id: string
  customerId: string
  customerEmail: string
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing' | 'unpaid'
  priceId: string
  productName: string
  amount: number
  currency: string
  interval: 'month' | 'year' | 'week' | 'day'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  created: string
}

export interface StripeInvoice {
  id: string
  customerId: string
  customerEmail: string
  subscriptionId?: string
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  amount: number
  currency: string
  dueDate?: string
  paidAt?: string
  created: string
  hostedInvoiceUrl?: string
  invoicePdf?: string
}

export interface StripeProduct {
  id: string
  name: string
  description?: string
  active: boolean
  images: string[]
  metadata?: Record<string, string>
  defaultPriceId?: string
  created: string
  updated: string
}

export interface StripePrice {
  id: string
  productId: string
  productName: string
  active: boolean
  currency: string
  unitAmount: number
  type: 'one_time' | 'recurring'
  interval?: 'month' | 'year' | 'week' | 'day'
  intervalCount?: number
  created: string
}

export interface StripeStats {
  mrr: number
  arr: number
  totalRevenue: number
  activeSubscriptions: number
  totalCustomers: number
  churnRate: number
  revenueGrowth: number
  currency: string
  lastUpdated: string
}

export interface StripeWebhookEvent {
  id: string
  type: string
  status: 'received' | 'processed' | 'failed'
  receivedAt: string
  processedAt?: string
  data: Record<string, unknown>
  error?: string
}
