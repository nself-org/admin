import { expect, test } from '@playwright/test'

const BASE = process.env.ADMIN_URL || 'http://localhost:3021'
test.use({ baseURL: BASE })

let adminReachable = false

test.beforeAll(async ({ playwright }) => {
  try {
    const ctx = await playwright.request.newContext({ baseURL: BASE })
    const resp = await ctx.head('/', { timeout: 5000 })
    adminReachable = resp.ok() || resp.status() < 500
    await ctx.dispose()
  } catch {
    adminReachable = false
  }
})

test.describe('Plugin Management UI', () => {
  test('Plugins page loads and displays plugin tables/cards', async ({ page }) => {
    test.skip(!adminReachable, 'nAdmin not reachable')

    const resp = await page.goto('/plugins')
    expect(resp?.status()).toBeLessThan(500)

    // Verify header exists
    await expect(page.locator('h1, h2').filter({ hasText: /Plugins|Ecosystem/i }).first()).toBeVisible()
    
    // Check for search input
    await expect(page.locator('input[type="text"], [placeholder*="Search"]').first()).toBeVisible()

    // Plugins list should render
    const pluginList = page.locator('[data-testid="plugin-list"], table tbody tr, [data-testid="plugin-card"]').first()
    await expect(pluginList).toBeVisible({ timeout: 10000 })
  })

  test('Clicking a plugin navigates to detail view', async ({ page }) => {
    test.skip(!adminReachable, 'nAdmin not reachable')

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
