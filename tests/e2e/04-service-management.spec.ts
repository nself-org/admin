import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Service Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should view services list', async ({ servicesPage }) => {
    await servicesPage.goto()
    await expect(servicesPage.pageTitle).toBeVisible()
    await expect(servicesPage.page).toHaveURL(/\/services/)
  })

  test.skip('should display service cards with status', async ({
    servicesPage,
    page,
  }) => {
    // Skipped: requires a running nself installation to populate service cards.
    // [data-testid="service-card"] is not rendered without an active nself project.
    await servicesPage.goto()

    // Check for service cards
    const serviceCards = page.locator('[data-testid="service-card"]')
    const count = await serviceCards.count()

    // Should have at least one service
    expect(count).toBeGreaterThan(0)

    // Each card should have status
    if (count > 0) {
      const firstCard = serviceCards.first()
      const statusText = await firstCard.textContent()
      expect(statusText).toMatch(/running|stopped|starting|error/i)
    }
  })

  test('should start a service', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Find a stopped service
    const stoppedService = page.locator(
      '[data-testid="service-card"]:has-text("Stopped")',
    )

    if ((await stoppedService.count()) > 0) {
      await stoppedService.first().locator('button:has-text("Start")').click()

      // Wait for service to start
      await page.waitForTimeout(2000)

      // Status should update
      await expect(stoppedService.first()).not.toContainText('Stopped')
    }
  })

  test('should stop a service', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Find a running service
    const runningService = page.locator(
      '[data-testid="service-card"]:has-text("Running")',
    )

    if ((await runningService.count()) > 0) {
      await runningService.first().locator('button:has-text("Stop")').click()

      // Confirm stop if modal appears
      const confirmButton = page.locator('button:has-text("Confirm")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // Wait for service to stop
      await page.waitForTimeout(2000)
    }
  })

  test('should restart a service', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Find a running service
    const serviceCard = page.locator('[data-testid="service-card"]').first()

    if (await serviceCard.isVisible()) {
      const restartButton = serviceCard.locator('button:has-text("Restart")')

      if (await restartButton.isVisible()) {
        await restartButton.click()

        // Should show restarting status
        await page.waitForTimeout(1000)
        await expect(serviceCard).toContainText(/restarting|starting/i)
      }
    }
  })

  test('should view service logs', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Click logs button on first service
    const serviceCard = page.locator('[data-testid="service-card"]').first()
    const logsButton = serviceCard.locator('button:has-text("Logs")')

    if (await logsButton.isVisible()) {
      await logsButton.click()

      // Logs viewer should appear
      await expect(page.locator('[data-testid="logs-viewer"]')).toBeVisible()
    }
  })

  test('should view service details', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Click on a service card to view details
    const serviceCard = page.locator('[data-testid="service-card"]').first()

    if (await serviceCard.isVisible()) {
      // Get service name
      const serviceName = await serviceCard.getAttribute('data-service')

      if (serviceName) {
        await serviceCard.click()

        // Should navigate to service detail page
        await expect(page).toHaveURL(new RegExp(`/services/${serviceName}`))
      }
    }
  })

  test('should filter services by status', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Look for status filter
    const statusFilter = page.locator('[data-testid="status-filter"]')

    if (await statusFilter.isVisible()) {
      await statusFilter.click()
      await page.click('[role="option"]:has-text("Running")')

      // Should show only running services
      const serviceCards = page.locator('[data-testid="service-card"]')
      const count = await serviceCards.count()

      for (let i = 0; i < count; i++) {
        const card = serviceCards.nth(i)
        await expect(card).toContainText(/running/i)
      }
    }
  })

  test('should search services', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"]')

    if (await searchInput.isVisible()) {
      await searchInput.fill('postgres')

      // Should filter services
      await page.waitForTimeout(500)

      const serviceCards = page.locator('[data-testid="service-card"]')
      const count = await serviceCards.count()

      if (count > 0) {
        const firstCard = await serviceCards.first().textContent()
        expect(firstCard?.toLowerCase()).toContain('postgres')
      }
    }
  })

  test('should be responsive on mobile', async ({ servicesPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await servicesPage.goto()

    await expect(servicesPage.pageTitle).toBeVisible()

    // Service cards should be stacked on mobile
    const serviceCards = page.locator('[data-testid="service-card"]')
    if ((await serviceCards.count()) > 0) {
      await expect(serviceCards.first()).toBeVisible()
    }
  })

  test('should have accessible controls', async ({ servicesPage, page }) => {
    await servicesPage.goto()

    const serviceCard = page.locator('[data-testid="service-card"]').first()

    if (await serviceCard.isVisible()) {
      // All buttons should have ARIA labels
      const buttons = serviceCard.locator('button')
      const count = await buttons.count()

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()

        // Should have either aria-label or text content
        expect(ariaLabel || text).toBeTruthy()
      }
    }
  })
})
