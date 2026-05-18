/**
 * Shopify Plugin Types for nself-admin v0.0.8
 */

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description?: string
  vendor?: string
  productType?: string
  status: 'active' | 'archived' | 'draft'
  tags: string[]
  images: string[]
  variantCount: number
  totalInventory: number
  priceRange: {
    min: number
    max: number
    currency: string
  }
  createdAt: string
  updatedAt: string
}

export interface ShopifyVariant {
  id: string
  productId: string
  title: string
  sku?: string
  barcode?: string
  price: number
  compareAtPrice?: number
  currency: string
  inventoryQuantity: number
  inventoryPolicy: 'deny' | 'continue'
  weight?: number
  weightUnit?: string
  requiresShipping: boolean
  taxable: boolean
  createdAt: string
  updatedAt: string
}

export interface ShopifyOrder {
  id: string
  name: string
  orderNumber: number
  email?: string
  phone?: string
  totalPrice: number
  subtotalPrice: number
  totalTax: number
  totalDiscounts: number
  totalShipping: number
  currency: string
  financialStatus: 'pending' | 'authorized' | 'paid' | 'partially_paid' | 'refunded' | 'voided'
  fulfillmentStatus: 'fulfilled' | 'partial' | 'unfulfilled' | 'restocked' | null
  lineItemsCount: number
  customerName?: string
  shippingAddress?: {
    city: string
    country: string
    province?: string
  }
  createdAt: string
  updatedAt: string
  cancelledAt?: string
}

export interface ShopifyCustomer {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  ordersCount: number
  totalSpent: number
  currency: string
  tags: string[]
  note?: string
  acceptsMarketing: boolean
  state: 'enabled' | 'disabled' | 'declined'
  createdAt: string
  updatedAt: string
}

export interface ShopifyInventoryLevel {
  inventoryItemId: string
  locationId: string
  locationName: string
  available: number
  incoming: number
  committed: number
  damaged: number
  reserved: number
  sku?: string
  productTitle: string
  variantTitle: string
}

export interface ShopifyStats {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  totalCustomers: number
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  currency: string
  lastSync: string
  periodComparison?: {
    revenueChange: number
    ordersChange: number
    customersChange: number
    period: 'day' | 'week' | 'month'
  }
}
