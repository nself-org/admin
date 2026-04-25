/**
 * Unit tests for the notifications API SDK (B19).
 *
 * Mocks global fetch — no real HTTP calls.
 */

import {
  campaigns,
  NotifyApiError,
  receipts,
  tokens,
  topics,
} from '../api/notifications'

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response)
}

function mockError(status: number, body = 'Error') {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: body }),
    text: () => Promise.resolve(body),
  } as unknown as Response)
}

afterEach(() => {
  jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// NotifyApiError
// ---------------------------------------------------------------------------

describe('NotifyApiError', () => {
  it('has correct status and message', () => {
    const err = new NotifyApiError(403, 'Forbidden')
    expect(err.status).toBe(403)
    expect(err.message).toBe('Forbidden')
    expect(err.name).toBe('NotifyApiError')
  })
})

// ---------------------------------------------------------------------------
// campaigns SDK
// ---------------------------------------------------------------------------

describe('campaigns.list', () => {
  it('calls /api/notifications/campaign and returns items', async () => {
    const payload = {
      items: [{ id: '1', title: 'Hello', status: 'sent' }],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    mockOk(payload)

    const result = await campaigns.list()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/notifications/campaign',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Hello')
  })

  it('appends status query param', async () => {
    mockOk({ items: [], total: 0, page: 1, pageSize: 20 })
    await campaigns.list({ status: 'scheduled' })
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('status=scheduled')
  })

  it('throws NotifyApiError on 403', async () => {
    mockError(403)
    try {
      await campaigns.list()
      fail('Expected NotifyApiError to be thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(NotifyApiError)
      expect((e as NotifyApiError).status).toBe(403)
    }
  })

  it('throws NotifyApiError on 429', async () => {
    mockError(429, 'Rate limited')
    await expect(campaigns.list()).rejects.toMatchObject({ status: 429 })
  })
})

describe('campaigns.create', () => {
  it('posts to /api/notifications/campaign', async () => {
    const created = {
      id: 'c1',
      title: 'Test',
      body: 'Body',
      status: 'draft',
      batchSize: 500,
      retryCount: 0,
      sourceAccountId: 'primary',
      createdAt: new Date().toISOString(),
    }
    mockOk(created)

    const result = await campaigns.create({ title: 'Test', body: 'Body' })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/notifications/campaign',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.id).toBe('c1')
  })
})

describe('campaigns.send', () => {
  it('posts to /campaign/:id/send', async () => {
    mockOk({ queued: true })
    await campaigns.send('c1')
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('/c1/send')
  })
})

describe('campaigns.stats', () => {
  it('returns stats object', async () => {
    const statsPayload = {
      total: 10,
      sent: 8,
      failed: 1,
      scheduled: 1,
      deliveryRate: 89,
    }
    mockOk(statsPayload)
    const result = await campaigns.stats()
    expect(result.deliveryRate).toBe(89)
  })
})

// ---------------------------------------------------------------------------
// topics SDK
// ---------------------------------------------------------------------------

describe('topics.list', () => {
  it('returns topic array', async () => {
    mockOk([
      {
        id: 't1',
        name: 'news',
        subscriberCount: 100,
        createdAt: new Date().toISOString(),
      },
    ])
    const result = await topics.list()
    expect(result[0].name).toBe('news')
  })
})

describe('topics.create', () => {
  it('posts with name body', async () => {
    mockOk({
      id: 't2',
      name: 'alerts',
      subscriberCount: 0,
      createdAt: new Date().toISOString(),
    })
    await topics.create('alerts')
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(JSON.parse(call[1].body)).toEqual({ name: 'alerts' })
  })
})

describe('topics.delete', () => {
  it('sends DELETE to /topics/:id', async () => {
    mockOk(null)
    await topics.delete('t1')
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(call[1].method).toBe('DELETE')
    expect(call[0]).toContain('/topics/t1')
  })
})

// ---------------------------------------------------------------------------
// receipts SDK
// ---------------------------------------------------------------------------

describe('receipts.summary', () => {
  it('passes days query param', async () => {
    mockOk([])
    await receipts.summary(30)
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('days=30')
  })
})

describe('receipts.exportCsv', () => {
  it('returns a URL string with format=csv', () => {
    const url = receipts.exportCsv()
    expect(url).toContain('format=csv')
  })

  it('includes campaignId when provided', () => {
    const url = receipts.exportCsv({ campaignId: 'c1' })
    expect(url).toContain('campaignId=c1')
  })
})

// ---------------------------------------------------------------------------
// tokens SDK
// ---------------------------------------------------------------------------

describe('tokens.health', () => {
  it('returns summary object', async () => {
    const summary = {
      total: 1000,
      valid: 900,
      invalid: 100,
      fcm: 600,
      apns: 400,
    }
    mockOk(summary)
    const result = await tokens.health()
    expect(result.total).toBe(1000)
    expect(result.invalid).toBe(100)
  })
})

describe('tokens.list', () => {
  it('passes platform filter', async () => {
    mockOk({ items: [], total: 0, page: 1, pageSize: 50 })
    await tokens.list({ platform: 'apns' })
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('platform=apns')
  })

  it('passes valid=false filter', async () => {
    mockOk({ items: [], total: 0, page: 1, pageSize: 50 })
    await tokens.list({ valid: false })
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('valid=false')
  })
})

describe('tokens.bulkInvalidate', () => {
  it('posts ids array', async () => {
    mockOk({ invalidated: 3 })
    await tokens.bulkInvalidate(['id1', 'id2', 'id3'])
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(call[1].method).toBe('POST')
    expect(JSON.parse(call[1].body)).toEqual({ ids: ['id1', 'id2', 'id3'] })
  })
})
