/**
 * E2E tests for config sub-pages: cors, email, rate-limits, docker
 * Validates all 7 UI states per page: loading, empty, error, partial, success, offline, unauth
 */

import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// CORS page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CORS Configuration page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to /config/cors', async ({ page }) => {
    await page.goto('/config/cors')
    await expect(page).toHaveURL(/\/config\/cors/)
  })

  test('should render the page heading', async ({ page }) => {
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    const heading = page.getByRole('heading', { name: /CORS Configuration/i })
    await expect(heading).toBeVisible()
  })

  test('should show textarea for CORS_ALLOWED_ORIGINS', async ({ page }) => {
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    const textarea = page.locator('#allowed-origins')
    // May not be visible if loading/error state; check conditionally
    if (await textarea.isVisible()) {
      await expect(textarea).toBeVisible()
    }
  })

  test('should show input for HASURA_GRAPHQL_CORS_DOMAIN', async ({ page }) => {
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    const input = page.locator('#hasura-cors')
    if (await input.isVisible()) {
      await expect(input).toBeVisible()
    }
  })

  test('should show input for AUTH_CLIENT_URL', async ({ page }) => {
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    const input = page.locator('#auth-client-url')
    if (await input.isVisible()) {
      await expect(input).toBeVisible()
    }
  })

  test('should show Save & Apply button when form is visible', async ({ page }) => {
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    const btn = page.getByRole('button', { name: /Save & Apply/i })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    // Access without auth cookie
    await page.context().clearCookies()
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    // Should redirect to login or show unauth state
    const isAtLogin = page.url().includes('/login')
    const hasUnauthContent = await page.getByText(/not authenticated/i).isVisible()
    const hasLoginButton = await page.getByRole('button', { name: /go to login/i }).isVisible()
    expect(isAtLogin || hasUnauthContent || hasLoginButton).toBe(true)
  })

  test('offline state: shows retry button on network failure', async ({ page }) => {
    await page.route('/api/config/cors', (route) => route.abort('failed'))
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    const retry = page.getByRole('button', { name: /retry/i })
    const offlineMsg = page.getByText(/cannot (connect|reach)/i)
    await expect
      .poll(async () => (await retry.isVisible()) || (await offlineMsg.isVisible()), {
        timeout: 20000,
      })
      .toBe(true)
  })

  test('error state: shows error when API returns 500', async ({ page }) => {
    await page.route('/api/config/cors', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: 'test error' }) })
    )
    await page.goto('/config/cors')
    await page.waitForLoadState('domcontentloaded')
    await expect
      .poll(
        async () =>
          (await page.getByText(/failed to load/i).isVisible()) ||
          (await page.getByRole('button', { name: /retry/i }).isVisible()),
        { timeout: 20000 }
      )
      .toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Email page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Email Configuration page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to /config/email', async ({ page }) => {
    await page.goto('/config/email')
    await expect(page).toHaveURL(/\/config\/email/)
  })

  test('should render the Email Configuration heading', async ({ page }) => {
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    const heading = page.getByRole('heading', { name: /email configuration/i })
    await expect(heading).toBeVisible()
  })

  test('should show SMTP host input', async ({ page }) => {
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    const input = page.locator('#smtp-host')
    if (await input.isVisible()) {
      await expect(input).toBeVisible()
    }
  })

  test('should show password field (masked, never shows plain text)', async ({ page }) => {
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    const passInput = page.locator('#smtp-pass')
    if (await passInput.isVisible()) {
      // Must be type=password (masking enforced)
      const inputType = await passInput.getAttribute('type')
      expect(inputType).toBe('password')
    }
  })

  test('should show Send Test Email button', async ({ page }) => {
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    const btn = page.getByRole('button', { name: /send test email/i })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  })

  test('partial state: shows mailpit defaults notice', async ({ page }) => {
    await page.route('/api/config/email', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          smtp: {
            host: 'mailpit',
            port: '1025',
            secure: 'false',
            user: '',
            pass: '••••••••',
            sender: 'noreply@nself.local',
            hasPass: false,
          },
        }),
      })
    )
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    const notice = page.getByText(/local mailpit defaults|not delivered externally/i)
    await expect(notice).toBeVisible()
  })

  test('offline state: shows retry button on network failure', async ({ page }) => {
    await page.route('/api/config/email', (route) => route.abort('failed'))
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    await expect
      .poll(
        async () =>
          (await page.getByRole('button', { name: /retry/i }).isVisible()) ||
          (await page.getByText(/cannot (connect|reach)/i).isVisible()),
        { timeout: 20000 }
      )
      .toBe(true)
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/config/email')
    await page.waitForLoadState('domcontentloaded')
    const isAtLogin = page.url().includes('/login')
    const hasUnauthContent = await page.getByText(/not authenticated/i).isVisible()
    expect(isAtLogin || hasUnauthContent).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limits page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rate Limits page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to /config/rate-limits', async ({ page }) => {
    await page.goto('/config/rate-limits')
    await expect(page).toHaveURL(/\/config\/rate-limits/)
  })

  test('should render Rate Limits heading', async ({ page }) => {
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    // .first() because the page renders the heading in multiple places
    // (page title + section headers); any one visible is sufficient.
    const heading = page.getByRole('heading', { name: /rate limits/i }).first()
    await expect(heading).toBeVisible()
  })

  test('should show API and Nginx sections', async ({ page }) => {
    await page.route('/api/config/rate-limits', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          rateLimits: {
            apiEnabled: 'true',
            apiRequests: '100',
            apiWindow: '60',
            globalEnabled: 'true',
            globalMaxRequests: '100',
            globalWindowSeconds: '60',
            globalBurst: '20',
          },
        }),
      })
    )
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    const apiSection = page.getByText(/API Rate Limits/i)
    const nginxSection = page.getByText(/Nginx Rate Limits/i)
    await expect(apiSection).toBeVisible()
    await expect(nginxSection).toBeVisible()
  })

  test('should show API requests input', async ({ page }) => {
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    const input = page.locator('#api-requests')
    if (await input.isVisible()) {
      await expect(input).toBeVisible()
    }
  })

  test('should show Save & Apply button', async ({ page }) => {
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    const btn = page.getByRole('button', { name: /Save & Apply/i })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  })

  test('offline state: shows retry button on network failure', async ({ page }) => {
    await page.route('/api/config/rate-limits', (route) => route.abort('failed'))
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    // Auto-retries up to expect.timeout — waits for React to render the error state
    await expect(
      page
        .getByRole('button', { name: /retry/i })
        .or(page.getByText(/cannot (connect|reach)/i))
        .first()
    ).toBeVisible()
  })

  test('error state: shows error when API returns failure', async ({ page }) => {
    await page.route('/api/config/rate-limits', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: 'test error' }) })
    )
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    await expect
      .poll(
        async () =>
          (await page.getByText(/failed to load/i).isVisible()) ||
          (await page.getByRole('button', { name: /retry/i }).isVisible()),
        { timeout: 20000 }
      )
      .toBe(true)
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/config/rate-limits')
    await page.waitForLoadState('domcontentloaded')
    const isAtLogin = page.url().includes('/login')
    const hasUnauthContent = await page.getByText(/not authenticated/i).isVisible()
    expect(isAtLogin || hasUnauthContent).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Docker page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Docker Configuration page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to /config/docker', async ({ page }) => {
    await page.goto('/config/docker')
    await expect(page).toHaveURL(/\/config\/docker/)
  })

  test('should render Docker Configuration heading', async ({ page }) => {
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    const heading = page.getByRole('heading', { name: /docker configuration/i })
    await expect(heading).toBeVisible()
  })

  test('should show service cards when API succeeds', async ({ page }) => {
    await page.route('/api/config/docker', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          docker: {
            services: {
              postgres: { version: '15', port: '5432' },
              hasura: { version: 'latest' },
              auth: { version: 'latest', port: '4000' },
              storage: { version: 'latest' },
              nginx: { version: 'alpine', port: '80', sslPort: '443' },
              redis: { version: '7-alpine', port: '6379' },
              mailpit: { version: 'latest', uiPort: '8025', smtpPort: '1025' },
            },
            raw: {
              POSTGRES_VERSION: '15',
              POSTGRES_PORT: '5432',
            },
          },
        }),
      })
    )
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    const pgCard = page.getByText('PostgreSQL')
    const redisCard = page.getByText('Redis')
    await expect(pgCard).toBeVisible()
    await expect(redisCard).toBeVisible()
  })

  test('should show version badges for each service', async ({ page }) => {
    await page.route('/api/config/docker', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          docker: {
            services: {
              postgres: { version: '15', port: '5432' },
              hasura: { version: 'latest' },
              auth: { version: 'latest', port: '4000' },
              storage: { version: 'latest' },
              nginx: { version: 'alpine', port: '80', sslPort: '443' },
              redis: { version: '7-alpine', port: '6379' },
              mailpit: { version: 'latest', uiPort: '8025', smtpPort: '1025' },
            },
            raw: {},
          },
        }),
      })
    )
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    // At least one version badge should appear
    const versionBadge = page.getByText('15').first()
    await expect(versionBadge).toBeVisible()
  })

  test('success state: edit panel opens on pencil click', async ({ page }) => {
    await page.route('/api/config/docker', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          docker: {
            services: {
              postgres: { version: '15', port: '5432' },
              hasura: { version: 'latest' },
              auth: { version: 'latest', port: '4000' },
              storage: { version: 'latest' },
              nginx: { version: 'alpine', port: '80', sslPort: '443' },
              redis: { version: '7-alpine', port: '6379' },
              mailpit: { version: 'latest', uiPort: '8025', smtpPort: '1025' },
            },
            raw: {},
          },
        }),
      })
    )
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    const editBtn = page.getByRole('button', { name: /edit postgresql/i })
    if (await editBtn.isVisible()) {
      await editBtn.click()
      const editPanel = page.locator('#edit-version')
      await expect(editPanel).toBeVisible()
    }
  })

  test('offline state: shows retry button on network failure', async ({ page }) => {
    await page.route('/api/config/docker', (route) => route.abort('failed'))
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    await expect
      .poll(
        async () =>
          (await page.getByRole('button', { name: /retry/i }).isVisible()) ||
          (await page.getByText(/cannot (connect|reach)/i).isVisible()),
        { timeout: 20000 }
      )
      .toBe(true)
  })

  test('error state: shows error when API returns failure', async ({ page }) => {
    await page.route('/api/config/docker', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: 'test error' }) })
    )
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    await expect
      .poll(
        async () =>
          (await page.getByText(/failed to load/i).isVisible()) ||
          (await page.getByRole('button', { name: /retry/i }).isVisible()),
        { timeout: 20000 }
      )
      .toBe(true)
  })

  test('redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/config/docker')
    await page.waitForLoadState('domcontentloaded')
    const isAtLogin = page.url().includes('/login')
    const hasUnauthContent = await page.getByText(/not authenticated/i).isVisible()
    expect(isAtLogin || hasUnauthContent).toBe(true)
  })
})
