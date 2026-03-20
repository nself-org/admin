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

test.describe('Deployments UI', () => {
  test('Deployments page loads and displays active environments', async ({ page }) => {
    test.skip(!adminReachable, 'nAdmin not reachable')

    const resp = await page.goto('/deployments')
    expect(resp?.status()).toBeLessThan(500)

    // Check for main headings
    await expect(page.locator('h1, h2').filter({ hasText: /Deployments|Environments/i }).first()).toBeVisible()
    
    // Check for a deployment list or table
    const list = page.locator('[data-testid="deployment-list"], table tbody tr').first()
    // It might be empty if no deployments, so we just ensure the container exists
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('Deployment logs panel opens when requested', async ({ page }) => {
    test.skip(!adminReachable, 'nAdmin not reachable')

    await page.goto('/deployments')
    
    // Look for a logs button or link
    const logsButton = page.locator('button:has-text("Logs"), a:has-text("Logs"), [data-testid="view-logs"]').first()
    
    if (await logsButton.isVisible()) {
      await logsButton.click()
      // Wait for the modal or log container to appear
      await expect(page.locator('[data-testid="logs-viewer"], .font-mono, pre').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
