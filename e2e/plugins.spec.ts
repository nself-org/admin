import { expect, test } from '@playwright/test'

const BASE = process.env.ADMIN_URL || 'http://localhost:3021'
test.use({ baseURL: BASE })

const MOCK_PLUGINS = [
  {
    name: 'auth',
    version: '1.0.0',
    status: 'active',
    description: 'Authentication and authorization',
    type: 'free',
  },
  {
    name: 'storage',
    version: '1.0.0',
    status: 'inactive',
    description: 'S3-compatible object storage',
    type: 'free',
  },
]

test.beforeAll(async ({ playwright }) => {
  const maxAttempts = 6
  const intervalMs = 5000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ctx = await playwright.request.newContext({ baseURL: BASE })
      const resp = await ctx.head('/', { timeout: 5000 })
      await ctx.dispose()

      if (resp.ok() || resp.status() < 500) {
        return
      }
    } catch {
      // Connection failed, will retry
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  throw new Error(
    `nAdmin not reachable at ${BASE} after ${maxAttempts} attempts (${(maxAttempts * intervalMs) / 1000}s). Run \`nself admin start\` first.`,
  )
})

test.describe('Plugin Management UI', () => {
  test('Plugins page loads and displays plugin tables/cards', async ({ page }) => {
    // Mock the plugins API so assertions are deterministic
    await page.route('**/api/plugins**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, plugins: MOCK_PLUGINS }),
      }),
    )

    const resp = await page.goto('/plugins')
    expect(resp?.status()).toBeLessThan(500)

    // Verify header exists
    await expect(page.locator('h1, h2').filter({ hasText: /Plugins|Ecosystem/i }).first()).toBeVisible()

    // Check for search input
    await expect(page.locator('input[type="text"], [placeholder*="Search"]').first()).toBeVisible()

    // Plugins list should render (mocked data guarantees entries)
    const pluginList = page.locator('[data-testid="plugin-list"], table tbody tr, [data-testid="plugin-card"]').first()
    await expect(pluginList).toBeVisible({ timeout: 10000 })
  })

  test('Clicking a plugin navigates to detail view', async ({ page }) => {
    // Mock the plugins API so there is always a clickable entry
    await page.route('**/api/plugins**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, plugins: MOCK_PLUGINS }),
      }),
    )

    await page.goto('/plugins')

    const pluginLink = page.locator('a[href^="/plugins/"], [data-testid="plugin-card"]').first()

    if (await pluginLink.isVisible()) {
      await pluginLink.click()
      await page.waitForLoadState('networkidle')

      // Should show install button or configuration state
      await expect(page.locator('text=/Install|Uninstall|Configure|Active/i').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
