/**
 * Typed SDK wrapping the notify plugin API.
 *
 * All requests hit the notify plugin via the admin API proxy.
 * Never calls FCM or APNs directly — the plugin handles that.
 */

const BASE = '/api/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'canceled'
export type Platform = 'fcm' | 'apns'

export interface Campaign {
  id: string
  title: string
  body: string
  data?: Record<string, unknown>
  topic?: string
  segment?: Record<string, unknown>
  scheduledAt?: string
  sentAt?: string
  status: CampaignStatus
  batchSize: number
  retryCount: number
  sourceAccountId: string
  createdAt: string
}

export interface CampaignStats {
  total: number
  sent: number
  failed: number
  scheduled: number
  deliveryRate: number
}

export interface Receipt {
  id: string
  campaignId: string
  deviceToken: string
  platform: Platform
  status: 'delivered' | 'failed' | 'pending'
  error?: string
  deliveredAt?: string
  attempt: number
}

export interface DLRSummary {
  date: string
  sent: number
  delivered: number
  failed: number
}

export interface Topic {
  id: string
  name: string
  subscriberCount: number
  createdAt: string
}

export interface DeviceToken {
  id: string
  userId: string
  token: string
  platform: Platform
  appId: string
  valid: boolean
  lastSeen: string
}

export interface TokenHealthSummary {
  total: number
  valid: number
  invalid: number
  fcm: number
  apns: number
}

export interface CreateCampaignInput {
  title: string
  body: string
  data?: Record<string, unknown>
  topic?: string
  segment?: Record<string, unknown>
  scheduledAt?: string
  batchSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class NotifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'NotifyApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 401 || res.status === 403) {
    throw new NotifyApiError(res.status, 'Permission denied')
  }
  if (res.status === 429) {
    throw new NotifyApiError(429, 'Rate limited — try again later')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error')
    throw new NotifyApiError(res.status, body)
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Campaign API
// ---------------------------------------------------------------------------

export const campaigns = {
  list(params?: { status?: CampaignStatus; page?: number; pageSize?: number }) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.pageSize != null) qs.set('pageSize', String(params.pageSize))
    const query = qs.toString() ? `?${qs}` : ''
    return request<PaginatedResult<Campaign>>(`/campaign${query}`)
  },

  get(id: string) {
    return request<Campaign>(`/campaign/${id}`)
  },

  create(input: CreateCampaignInput) {
    return request<Campaign>('/campaign', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  update(id: string, input: Partial<CreateCampaignInput>) {
    return request<Campaign>(`/campaign/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  delete(id: string) {
    return request<void>(`/campaign/${id}`, { method: 'DELETE' })
  },

  send(id: string) {
    return request<{ queued: true }>(`/campaign/${id}/send`, {
      method: 'POST',
    })
  },

  stats(): Promise<CampaignStats> {
    return request<CampaignStats>('/campaign/stats')
  },
}

// ---------------------------------------------------------------------------
// Topics API
// ---------------------------------------------------------------------------

export const topics = {
  list() {
    return request<Topic[]>('/topics')
  },

  create(name: string) {
    return request<Topic>('/topics', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  delete(id: string) {
    return request<void>(`/topics/${id}`, { method: 'DELETE' })
  },

  subscribers(id: string) {
    return request<DeviceToken[]>(`/topics/${id}/subs`)
  },

  bulkSubscribe(id: string, tokens: string[]) {
    return request<{ added: number }>(`/topics/${id}/subs`, {
      method: 'POST',
      body: JSON.stringify({ tokens }),
    })
  },
}

// ---------------------------------------------------------------------------
// DLR (delivery receipt) API
// ---------------------------------------------------------------------------

export const receipts = {
  report(params?: {
    campaignId?: string
    since?: string
    until?: string
    status?: Receipt['status']
  }) {
    const qs = new URLSearchParams()
    if (params?.campaignId) qs.set('campaignId', params.campaignId)
    if (params?.since) qs.set('since', params.since)
    if (params?.until) qs.set('until', params.until)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString() ? `?${qs}` : ''
    return request<Receipt[]>(`/receipts${query}`)
  },

  summary(days: 7 | 30 = 7) {
    return request<DLRSummary[]>(`/receipts/summary?days=${days}`)
  },

  exportCsv(params?: { campaignId?: string; since?: string }): string {
    const qs = new URLSearchParams()
    if (params?.campaignId) qs.set('campaignId', params.campaignId)
    if (params?.since) qs.set('since', params.since)
    qs.set('format', 'csv')
    return `${BASE}/receipts?${qs}`
  },
}

// ---------------------------------------------------------------------------
// Device token API
// ---------------------------------------------------------------------------

export const tokens = {
  health() {
    return request<TokenHealthSummary>('/tokens/health')
  },

  list(params?: { platform?: Platform; valid?: boolean; page?: number }) {
    const qs = new URLSearchParams()
    if (params?.platform) qs.set('platform', params.platform)
    if (params?.valid != null) qs.set('valid', String(params.valid))
    if (params?.page != null) qs.set('page', String(params.page))
    const query = qs.toString() ? `?${qs}` : ''
    return request<PaginatedResult<DeviceToken>>(`/tokens${query}`)
  },

  bulkInvalidate(ids: string[]) {
    return request<{ invalidated: number }>('/tokens/invalidate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },
}
