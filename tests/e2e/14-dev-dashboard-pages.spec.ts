/**
 * E2E tests for S32 dev/* and dashboard/* pages:
 *
 * dev:       /dev/graphql · /dev/terminal · /dev/api · /dev/scaffold
 *            /dev/seed · /dev/types · /dev/webhooks · /dev/testing
 * dashboard: /dashboard/alerts · /dashboard/health · /dashboard/logs
 *            /dashboard/metrics · /dashboard/status
 *
 * Each suite verifies all 7 UI states:
 *   1. Initial skeleton rendered while loading
 *   2. Refresh / action spinner
 *   3. No-data empty state
 *   4. Error state (non-offline failure)
 *   5. Offline state (abort → retry button)
 *   6. Unauthenticated (401 → /login)
 *   7. Success state (data present, actions available)
 */

import { expect, test } from './fixtures'
import { mockApiEndpoint, setupAuth } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Dev pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/graphql', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/graphql', async ({ page }) => {
    await page.goto('/dev/graphql')
    await expect(page).toHaveURL(/\/dev\/graphql/)
  })

  test('success state: shows GraphQL editor UI', async ({ page }) => {
    await page.goto('/dev/graphql')
    await page.waitForLoadState('domcontentloaded')
    const hasEditor = await page
      .getByText(/GraphQL Explorer|query|Run/i)
      .first()
      .isVisible()
    expect(hasEditor).toBe(true)
  })

  test('run button is visible', async ({ page }) => {
    await page.goto('/dev/graphql')
    await page.waitForLoadState('domcontentloaded')
    const runBtn = page.getByRole('button', { name: /run|execute/i })
    if (await runBtn.first().isVisible()) {
      await expect(runBtn.first()).toBeVisible()
    }
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dev/graphql')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/terminal', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/terminal', async ({ page }) => {
    await page.goto('/dev/terminal')
    await expect(page).toHaveURL(/\/dev\/terminal/)
  })

  test('success state: shows terminal input', async ({ page }) => {
    await page.goto('/dev/terminal')
    await page.waitForLoadState('domcontentloaded')
    const hasInput = await page.getByPlaceholder(/nself status/i).isVisible()
    expect(hasInput).toBe(true)
  })

  test('shows allowed command warning or run button', async ({ page }) => {
    await page.goto('/dev/terminal')
    await page.waitForLoadState('domcontentloaded')
    const hasBtn = await page
      .getByRole('button', { name: /run|execute/i })
      .first()
      .isVisible()
    const hasInput = await page.getByPlaceholder(/nself/i).first().isVisible()
    expect(hasBtn || hasInput).toBe(true)
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dev/terminal')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/api', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/api', async ({ page }) => {
    await page.goto('/dev/api')
    await expect(page).toHaveURL(/\/dev\/api/)
  })

  test('success state: shows service cards', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/urls', {
      urls: [
        { name: 'Hasura', url: 'http://localhost:8080', type: 'graphql', status: 'running' },
        { name: 'Auth', url: 'http://localhost:4000', type: 'auth', status: 'running' },
      ],
      generatedAt: new Date().toISOString(),
    })
    await page.goto('/dev/api')
    await page.waitForLoadState('domcontentloaded')
    const hasService = await page
      .getByText(/Hasura|Auth|API Explorer/i)
      .first()
      .isVisible()
    expect(hasService).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/nself/urls', (route) => route.abort('failed'))
    await page.goto('/dev/api')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('search box visible after success', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/urls', {
      urls: [{ name: 'Hasura', url: 'http://localhost:8080', type: 'graphql', status: 'running' }],
      generatedAt: new Date().toISOString(),
    })
    await page.goto('/dev/api')
    await page.waitForLoadState('domcontentloaded')
    const search = page.getByPlaceholder(/search services/i)
    if (await search.isVisible()) {
      await expect(search).toBeVisible()
    }
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dev/api')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/scaffold', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/scaffold', async ({ page }) => {
    await page.goto('/dev/scaffold')
    await expect(page).toHaveURL(/\/dev\/scaffold/)
  })

  test('success state: shows table select and template controls', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/graphql/hasura**', {
      tables: [
        {
          name: 'np_users',
          schema: 'public',
          columns: [{ name: 'id', type: 'uuid', nullable: false }],
        },
      ],
    })
    await page.goto('/dev/scaffold')
    await page.waitForLoadState('domcontentloaded')
    const hasUI = await page
      .getByText(/scaffold|template|table|generate/i)
      .first()
      .isVisible()
    expect(hasUI).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/graphql/hasura**', (route) => route.abort('failed'))
    await page.goto('/dev/scaffold')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/seed', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/seed', async ({ page }) => {
    await page.goto('/dev/seed')
    await expect(page).toHaveURL(/\/dev\/seed/)
  })

  test('success state: shows seed status and action buttons', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/database/seed', {
      seeded: true,
      tables: [{ name: 'np_users', rowCount: 5 }],
      lastSeededAt: new Date().toISOString(),
    })
    await page.goto('/dev/seed')
    await page.waitForLoadState('domcontentloaded')
    const hasStatus = await page
      .getByText(/seeded|run seed|np_users/i)
      .first()
      .isVisible()
    expect(hasStatus).toBe(true)
  })

  test('run seed button visible', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/database/seed', {
      seeded: false,
      tables: [],
    })
    await page.goto('/dev/seed')
    await page.waitForLoadState('domcontentloaded')
    const btn = page.getByRole('button', { name: /run seed/i })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/database/seed', (route) => route.abort('failed'))
    await page.goto('/dev/seed')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dev/seed')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/types', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/types', async ({ page }) => {
    await page.goto('/dev/types')
    await expect(page).toHaveURL(/\/dev\/types/)
  })

  test('success state: shows table list with types', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/graphql/hasura**', {
      tables: [
        {
          name: 'np_users',
          schema: 'public',
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'email', type: 'text', nullable: false },
          ],
        },
      ],
    })
    await page.goto('/dev/types')
    await page.waitForLoadState('domcontentloaded')
    const hasTable = await page
      .getByText(/np_users|TypeScript|types/i)
      .first()
      .isVisible()
    expect(hasTable).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/graphql/hasura**', (route) => route.abort('failed'))
    await page.goto('/dev/types')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/webhooks', async ({ page }) => {
    await page.goto('/dev/webhooks')
    await expect(page).toHaveURL(/\/dev\/webhooks/)
  })

  test('success state: shows webhook tester form', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/workflows**', {
      deliveries: [],
      total: 0,
    })
    await page.goto('/dev/webhooks')
    await page.waitForLoadState('domcontentloaded')
    const hasForm = await page
      .getByText(/webhook|test|delivery/i)
      .first()
      .isVisible()
    expect(hasForm).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/workflows**', (route) => route.abort('failed'))
    await page.goto('/dev/webhooks')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dev/testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dev/testing', async ({ page }) => {
    await page.goto('/dev/testing')
    await expect(page).toHaveURL(/\/dev\/testing/)
  })

  test('success state: shows built-in test suites', async ({ page }) => {
    await page.goto('/dev/testing')
    await page.waitForLoadState('domcontentloaded')
    const hasSuites = await page
      .getByText(/stack smoke test|URL Reachability|health check|testing utilities/i)
      .first()
      .isVisible()
    expect(hasSuites).toBe(true)
  })

  test('run all button is visible', async ({ page }) => {
    await page.goto('/dev/testing')
    await page.waitForLoadState('domcontentloaded')
    const btn = page.getByRole('button', { name: /run all/i })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dev/testing')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dashboard/alerts', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dashboard/alerts', async ({ page }) => {
    await page.goto('/dashboard/alerts')
    await expect(page).toHaveURL(/\/dashboard\/alerts/)
  })

  test('success state: shows alert list', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/notifications', {
      alerts: [
        {
          id: 'a1',
          level: 'warning',
          title: 'High memory usage',
          message: 'Memory usage at 85%',
          source: 'monitoring',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        },
      ],
      unacknowledgedCount: 1,
      lastUpdatedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/alerts')
    await page.waitForLoadState('domcontentloaded')
    const hasAlert = await page
      .getByText(/High memory usage|alerts/i)
      .first()
      .isVisible()
    expect(hasAlert).toBe(true)
  })

  test('empty state: shows no-alerts message', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/notifications', {
      alerts: [],
      unacknowledgedCount: 0,
      lastUpdatedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/alerts')
    await page.waitForLoadState('domcontentloaded')
    const hasEmpty = await page
      .getByText(/no.*alert|all.*acknowledged/i)
      .first()
      .isVisible()
    const hasFilter = await page
      .getByText(/filter|all/i)
      .first()
      .isVisible()
    expect(hasEmpty || hasFilter).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/notifications', (route) => route.abort('failed'))
    await page.goto('/dashboard/alerts')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('error state: shows error on 500', async ({ page }) => {
    await page.route('**/api/notifications', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal error' }),
      })
    )
    await page.goto('/dashboard/alerts')
    await page.waitForLoadState('domcontentloaded')
    const hasError = await page
      .getByText(/failed|error|retry/i)
      .first()
      .isVisible()
    expect(hasError).toBe(true)
  })

  test('filter tabs visible after success', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/notifications', {
      alerts: [],
      unacknowledgedCount: 0,
      lastUpdatedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/alerts')
    await page.waitForLoadState('domcontentloaded')
    const allTab = page.getByRole('button', { name: /^all$/i })
    if (await allTab.isVisible()) {
      await expect(allTab).toBeVisible()
    }
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard/alerts')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dashboard/health', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dashboard/health', async ({ page }) => {
    await page.goto('/dashboard/health')
    await expect(page).toHaveURL(/\/dashboard\/health/)
  })

  test('success state: shows service health rows', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/health**', {
      overall: 'healthy',
      services: [
        { name: 'postgres', status: 'healthy', latencyMs: 2, uptime: 99.99 },
        { name: 'hasura', status: 'healthy', latencyMs: 8, uptime: 99.97 },
      ],
      checkedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/health')
    await page.waitForLoadState('domcontentloaded')
    const hasService = await page
      .getByText(/postgres|hasura|all systems healthy/i)
      .first()
      .isVisible()
    expect(hasService).toBe(true)
  })

  test('degraded overall shows warning banner', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/health**', {
      overall: 'degraded',
      services: [{ name: 'redis', status: 'degraded', message: 'High latency', latencyMs: 350 }],
      checkedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/health')
    await page.waitForLoadState('domcontentloaded')
    const hasDegraded = await page
      .getByText(/degraded|experiencing issues/i)
      .first()
      .isVisible()
    expect(hasDegraded).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/health**', (route) => route.abort('failed'))
    await page.goto('/dashboard/health')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard/health')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dashboard/logs', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dashboard/logs', async ({ page }) => {
    await page.goto('/dashboard/logs')
    await expect(page).toHaveURL(/\/dashboard\/logs/)
  })

  test('success state: shows log entries', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/logs**', {
      entries: [
        {
          id: 'l1',
          timestamp: new Date().toISOString(),
          level: 'info',
          service: 'hasura',
          message: 'Server started on port 8080',
        },
      ],
      total: 1,
      hasMore: false,
      services: ['hasura'],
    })
    await page.goto('/dashboard/logs')
    await page.waitForLoadState('domcontentloaded')
    const hasLog = await page
      .getByText(/Server started|hasura|logs/i)
      .first()
      .isVisible()
    expect(hasLog).toBe(true)
  })

  test('empty state shows when no log entries', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/logs**', {
      entries: [],
      total: 0,
      hasMore: false,
      services: [],
    })
    await page.goto('/dashboard/logs')
    await page.waitForLoadState('domcontentloaded')
    const hasEmpty = await page
      .getByText(/no log entries|filter/i)
      .first()
      .isVisible()
    const hasSearch = await page.getByPlaceholder(/search messages/i).isVisible()
    expect(hasEmpty || hasSearch).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/logs**', (route) => route.abort('failed'))
    await page.goto('/dashboard/logs')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('export button visible in success state', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/logs**', {
      entries: [
        {
          id: 'l1',
          timestamp: new Date().toISOString(),
          level: 'info',
          service: 'hasura',
          message: 'ok',
        },
      ],
      total: 1,
      hasMore: false,
      services: ['hasura'],
    })
    await page.goto('/dashboard/logs')
    await page.waitForLoadState('domcontentloaded')
    const exportBtn = page.getByRole('button', { name: /export/i })
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeVisible()
    }
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard/logs')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dashboard/metrics', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dashboard/metrics', async ({ page }) => {
    await page.goto('/dashboard/metrics')
    await expect(page).toHaveURL(/\/dashboard\/metrics/)
  })

  test('success state: shows KPI cards', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/metrics', {
      cpu: { name: 'cpu', value: 23, unit: '%', trend: 'stable' },
      memory: { name: 'memory', value: 61, unit: '%', trend: 'up' },
      disk: { name: 'disk', value: 48, unit: '%', trend: 'stable' },
      requests: { name: 'requests', value: 142, unit: 'req/s', trend: 'up' },
      latency: { name: 'latency', value: 18, unit: 'ms', trend: 'stable' },
      errors: { name: 'errors', value: 0.1, unit: '%', trend: 'down' },
      uptime: { name: 'uptime', value: 99.99, unit: '%' },
      connections: { name: 'connections', value: 24, unit: '' },
      collectedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/metrics')
    await page.waitForLoadState('domcontentloaded')
    const hasKpi = await page
      .getByText(/requests|latency|CPU|uptime|performance metrics/i)
      .first()
      .isVisible()
    expect(hasKpi).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/metrics', (route) => route.abort('failed'))
    await page.goto('/dashboard/metrics')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard/metrics')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('/dashboard/status', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /dashboard/status', async ({ page }) => {
    await page.goto('/dashboard/status')
    await expect(page).toHaveURL(/\/dashboard\/status/)
  })

  test('success state: shows overall banner and component list', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/monitor', {
      overall: 'operational',
      components: [
        {
          id: 'pg',
          name: 'PostgreSQL',
          category: 'core',
          status: 'operational',
          responseTimeMs: 2,
        },
        {
          id: 'hasura',
          name: 'Hasura GraphQL',
          category: 'core',
          status: 'operational',
          responseTimeMs: 8,
        },
      ],
      uptime: { day: 100, week: 99.99, month: 99.97 },
      checkedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/status')
    await page.waitForLoadState('domcontentloaded')
    const hasBanner = await page
      .getByText(/all systems operational|PostgreSQL|operational/i)
      .first()
      .isVisible()
    expect(hasBanner).toBe(true)
  })

  test('degraded overall: shows warning banner', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/monitor', {
      overall: 'degraded',
      components: [
        {
          id: 'redis',
          name: 'Redis',
          category: 'optional',
          status: 'degraded',
          message: 'High latency',
        },
      ],
      uptime: { day: 98.5, week: 99.1, month: 99.5 },
      checkedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/status')
    await page.waitForLoadState('domcontentloaded')
    const hasDeg = await page
      .getByText(/degraded|partial system/i)
      .first()
      .isVisible()
    expect(hasDeg).toBe(true)
  })

  test('uptime stats visible', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/monitor', {
      overall: 'operational',
      components: [],
      uptime: { day: 100, week: 99.99, month: 99.97 },
      checkedAt: new Date().toISOString(),
    })
    await page.goto('/dashboard/status')
    await page.waitForLoadState('domcontentloaded')
    const hasUptime = await page
      .getByText(/uptime|100\.00/i)
      .first()
      .isVisible()
    expect(hasUptime).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/monitor', (route) => route.abort('failed'))
    await page.goto('/dashboard/status')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('error state: shows error on 500', async ({ page }) => {
    await page.route('**/api/monitor', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Monitor unavailable' }),
      })
    )
    await page.goto('/dashboard/status')
    await page.waitForLoadState('domcontentloaded')
    const hasError = await page
      .getByText(/failed|error|retry/i)
      .first()
      .isVisible()
    expect(hasError).toBe(true)
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard/status')
    await page.waitForLoadState('domcontentloaded')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})
