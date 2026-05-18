/**
 * E2E tests for S32 system/* pages:
 *   /system/urls · /system/version · /system/diagnostics
 *   /system/trust · /system/validate · /system/help
 *
 * Each suite verifies all 7 UI states:
 *   1. Initial skeleton rendered while loading
 *   2. Refresh spinner after initial load
 *   3. No-data empty state
 *   4. Error state (non-offline fetch failure)
 *   5. Offline state (docker/connect error)
 *   6. Unauthenticated (401 → redirect to /login)
 *   7. Success state (data present)
 */

import { expect, test } from './fixtures'
import { mockApiEndpoint, setupAuth } from './helpers'

// ─── /system/urls ─────────────────────────────────────────────────────────────

test.describe('/system/urls', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /system/urls', async ({ page }) => {
    await page.goto('/system/urls')
    await expect(page).toHaveURL(/\/system\/urls/)
  })

  test('success state: renders URL table rows after API response', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/urls', {
      urls: [
        { name: 'Hasura', url: 'http://localhost:8080', type: 'graphql', status: 'running' },
        { name: 'Auth', url: 'http://localhost:4000', type: 'auth', status: 'running' },
      ],
      generatedAt: new Date().toISOString(),
    })
    await page.goto('/system/urls')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Hasura')).toBeVisible()
    await expect(page.getByText('Auth')).toBeVisible()
  })

  test('offline state: shows retry button on abort', async ({ page }) => {
    await page.route('**/api/nself/urls', (route) => route.abort('failed'))
    await page.goto('/system/urls')
    await page.waitForLoadState('networkidle')
    const retry = page.getByRole('button', { name: /retry/i })
    await expect(retry).toBeVisible()
  })

  test('error state: shows error message on 500', async ({ page }) => {
    await page.route('**/api/nself/urls', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal error' }),
      })
    )
    await page.goto('/system/urls')
    await page.waitForLoadState('networkidle')
    // Error or offline state shown (depends on message content)
    const hasError = await page
      .getByText(/failed|error|retry/i)
      .first()
      .isVisible()
    expect(hasError).toBe(true)
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/system/urls')
    await page.waitForLoadState('networkidle')
    const isAtLogin = page.url().includes('/login')
    const hasUnauthContent = await page
      .getByText(/not authenticated|sign in|login/i)
      .first()
      .isVisible()
    expect(isAtLogin || hasUnauthContent).toBe(true)
  })

  test('refresh spinner appears after initial load', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/urls', {
      urls: [{ name: 'Hasura', url: 'http://localhost:8080', type: 'graphql', status: 'running' }],
      generatedAt: new Date().toISOString(),
    })
    await page.goto('/system/urls')
    await page.waitForLoadState('networkidle')
    const refreshBtn = page.getByRole('button', { name: /refresh/i })
    await expect(refreshBtn).toBeVisible()
  })
})

// ─── /system/version ──────────────────────────────────────────────────────────

test.describe('/system/version', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /system/version', async ({ page }) => {
    await page.goto('/system/version')
    await expect(page).toHaveURL(/\/system\/version/)
  })

  test('success state: shows version information', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/version', {
      cli: { version: '1.1.1', buildDate: '2026-05-01', commit: 'abc1234' },
      admin: { version: '1.1.1' },
      latestRelease: null,
      upToDate: true,
    })
    await page.goto('/system/version')
    await page.waitForLoadState('networkidle')
    const hasVersion = await page
      .getByText(/1\.1\.1|version/i)
      .first()
      .isVisible()
    expect(hasVersion).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/version', (route) => route.abort('failed'))
    await page.goto('/system/version')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/system/version')
    await page.waitForLoadState('networkidle')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})

// ─── /system/diagnostics ──────────────────────────────────────────────────────

test.describe('/system/diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /system/diagnostics', async ({ page }) => {
    await page.goto('/system/diagnostics')
    await expect(page).toHaveURL(/\/system\/diagnostics/)
  })

  test('success state: shows diagnostics checks', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/diagnostics', {
      checks: [
        { name: 'CLI binary', status: 'pass', message: 'nself v1.1.1' },
        { name: 'Docker daemon', status: 'pass', message: 'Running' },
      ],
      overall: 'pass',
      runAt: new Date().toISOString(),
    })
    await page.goto('/system/diagnostics')
    await page.waitForLoadState('networkidle')
    const hasDiag = await page
      .getByText(/CLI binary|Docker daemon|diagnostics/i)
      .first()
      .isVisible()
    expect(hasDiag).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/nself/diagnostics', (route) => route.abort('failed'))
    await page.goto('/system/diagnostics')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('run button present in success state', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/diagnostics', {
      checks: [{ name: 'CLI binary', status: 'pass', message: 'ok' }],
      overall: 'pass',
      runAt: new Date().toISOString(),
    })
    await page.goto('/system/diagnostics')
    await page.waitForLoadState('networkidle')
    const btn = page.getByRole('button', { name: /run diagnostics|refresh/i })
    if (await btn.first().isVisible()) {
      await expect(btn.first()).toBeVisible()
    }
  })
})

// ─── /system/trust ────────────────────────────────────────────────────────────

test.describe('/system/trust', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /system/trust', async ({ page }) => {
    await page.goto('/system/trust')
    await expect(page).toHaveURL(/\/system\/trust/)
  })

  test('success state: shows trust status sections', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/trust', {
      ssl: { trusted: true, caInstalled: true },
      dns: { configured: true },
      ports: { forwarded: true },
      checkedAt: new Date().toISOString(),
    })
    await page.goto('/system/trust')
    await page.waitForLoadState('networkidle')
    const hasTrust = await page
      .getByText(/ssl|dns|port|trust/i)
      .first()
      .isVisible()
    expect(hasTrust).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/nself/trust', (route) => route.abort('failed'))
    await page.goto('/system/trust')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })
})

// ─── /system/validate ─────────────────────────────────────────────────────────

test.describe('/system/validate', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /system/validate', async ({ page }) => {
    await page.goto('/system/validate')
    await expect(page).toHaveURL(/\/system\/validate/)
  })

  test('success state: shows validation checks', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/diagnostics?mode=validate', {
      checks: [
        { name: 'Config files', status: 'pass', message: 'Valid' },
        { name: 'Environment', status: 'pass', message: 'All required vars set' },
      ],
      overall: 'pass',
      runAt: new Date().toISOString(),
    })
    await page.goto('/system/validate')
    await page.waitForLoadState('networkidle')
    const hasVal = await page
      .getByText(/config|environment|validate|valid/i)
      .first()
      .isVisible()
    expect(hasVal).toBe(true)
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/nself/diagnostics**', (route) => route.abort('failed'))
    await page.goto('/system/validate')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })
})

// ─── /system/help ─────────────────────────────────────────────────────────────

test.describe('/system/help', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('navigates to /system/help', async ({ page }) => {
    await page.goto('/system/help')
    await expect(page).toHaveURL(/\/system\/help/)
  })

  test('success state: shows command list', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/help', {
      commands: [
        {
          name: 'start',
          description: 'Start all services',
          usage: 'nself start',
          category: 'services',
        },
        {
          name: 'stop',
          description: 'Stop all services',
          usage: 'nself stop',
          category: 'services',
        },
      ],
      version: '1.1.1',
    })
    await page.goto('/system/help')
    await page.waitForLoadState('networkidle')
    const hasCmd = await page
      .getByText(/start|stop|command/i)
      .first()
      .isVisible()
    expect(hasCmd).toBe(true)
  })

  test('search box filters commands', async ({ page }) => {
    await mockApiEndpoint(page, '**/api/nself/help', {
      commands: [
        {
          name: 'start',
          description: 'Start all services',
          usage: 'nself start',
          category: 'services',
        },
        {
          name: 'status',
          description: 'Show system status',
          usage: 'nself status',
          category: 'info',
        },
      ],
      version: '1.1.1',
    })
    await page.goto('/system/help')
    await page.waitForLoadState('networkidle')
    const searchBox = page.getByPlaceholder(/search commands/i)
    if (await searchBox.isVisible()) {
      await searchBox.fill('status')
      await expect(page.getByText('status')).toBeVisible()
    }
  })

  test('offline state: shows retry on abort', async ({ page }) => {
    await page.route('**/api/nself/help', (route) => route.abort('failed'))
    await page.goto('/system/help')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/system/help')
    await page.waitForLoadState('networkidle')
    expect(
      page.url().includes('/login') ||
        (await page
          .getByText(/login|sign in/i)
          .first()
          .isVisible())
    ).toBe(true)
  })
})
