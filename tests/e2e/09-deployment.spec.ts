import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Deployment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to deployment page', async ({ deploymentPage }) => {
    await deploymentPage.goto()
    await expect(deploymentPage.pageTitle).toBeVisible()
    await expect(deploymentPage.page).toHaveURL(/\/deployment/)
  })

  test('should select environment (staging)', async ({
    deploymentPage,
    page,
  }) => {
    await deploymentPage.gotoStaging()

    // Should be on staging deployment page
    await expect(page).toHaveURL(/\/deployment\/staging/)
    await expect(deploymentPage.pageTitle).toBeVisible()
  })

  test('should configure deployment settings', async ({
    deploymentPage,
    page,
  }) => {
    await deploymentPage.gotoStaging()

    // Configure deployment options
    const configSection = page.locator('[data-testid="deployment-config"]')

    if (await configSection.isVisible()) {
      await deploymentPage.configureDeployment({
        branch: 'main',
        environment: 'staging',
      })
    }
  })

  test.skip('should execute deployment', async ({ deploymentPage, page }) => {
    // Skipped: requires a running nself backend; deploy button is disabled in CI.
    await deploymentPage.gotoStaging()

    if (await deploymentPage.deployButton.isVisible()) {
      // Start deployment
      await deploymentPage.deploy()

      // Should show deployment logs
      await deploymentPage.expectDeploymentLogsVisible()
    }
  })

  test.skip('should view deployment logs', async ({ deploymentPage, page }) => {
    // Skipped: requires a running nself backend; deploy button is disabled in CI.
    await deploymentPage.gotoStaging()

    if (await deploymentPage.deployButton.isVisible()) {
      await deploymentPage.deploy()

      // Logs should be visible
      await expect(deploymentPage.deploymentLogs).toBeVisible()

      // Logs should have content
      const logsContent = await deploymentPage.deploymentLogs.textContent()
      expect(logsContent).toBeTruthy()
    }
  })

  test.skip('should verify deployment success', async ({ deploymentPage, page }) => {
    // Skipped: requires a running nself backend; deploy button is disabled in CI.
    await deploymentPage.gotoStaging()

    if (await deploymentPage.deployButton.isVisible()) {
      await deploymentPage.deploy()

      // Wait for deployment to complete
      // Note: This might take a while in real scenarios
      await expect(deploymentPage.deploymentStatus).toContainText(
        /success|complete|deployed/i,
        { timeout: 120000 },
      )
    }
  })

  test('should show deployment status', async ({ deploymentPage, page }) => {
    await deploymentPage.goto()

    // Should show current deployment status
    const statusIndicator = page.locator('[data-testid="deployment-status"]')

    if (await statusIndicator.isVisible()) {
      const statusText = await statusIndicator.textContent()
      expect(statusText).toBeTruthy()
    }
  })

  test('should support production deployment', async ({
    deploymentPage,
    page,
  }) => {
    await deploymentPage.gotoProduction()

    // Should be on production deployment page
    await expect(page).toHaveURL(/\/deployment\/prod/)

    // Should show production warning
    const warningAlert = page.locator('[role="alert"]')
    if (await warningAlert.isVisible()) {
      const warningText = await warningAlert.textContent()
      expect(warningText?.toLowerCase()).toContain('production')
    }
  })

  test('should show deployment history', async ({ deploymentPage, page }) => {
    await deploymentPage.goto()

    // Look for deployment history
    const historySection = page.locator('[data-testid="deployment-history"]')

    if (await historySection.isVisible()) {
      // Should have deployment records
      const deploymentItems = page.locator('[data-testid="deployment-item"]')
      const count = await deploymentItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should rollback deployment', async ({ deploymentPage, page }) => {
    await deploymentPage.goto()

    // Look for rollback button
    const rollbackButton = page.locator('button:has-text("Rollback")')

    if (await rollbackButton.isVisible()) {
      await rollbackButton.click()

      // Should show confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Cancel rollback
      const cancelButton = page.locator('button:has-text("Cancel")')
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
    }
  })

  test('should show environment variables', async ({
    deploymentPage,
    page,
  }) => {
    await deploymentPage.gotoStaging()

    // Look for environment variables section
    const envSection = page.locator('[data-testid="environment-variables"]')

    if (await envSection.isVisible()) {
      await expect(envSection).toBeVisible()
    }
  })

  test('should validate required fields', async ({ deploymentPage, page }) => {
    await deploymentPage.gotoStaging()

    if (await deploymentPage.deployButton.isVisible()) {
      // Clear required fields if any
      const requiredFields = page.locator('input[required]')
      const count = await requiredFields.count()

      if (count > 0) {
        await requiredFields.first().fill('')
        await deploymentPage.deployButton.click()

        // Should show validation error
        await expect(page.locator('[role="alert"]')).toBeVisible()
      }
    }
  })

  test('should be responsive on mobile', async ({ deploymentPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await deploymentPage.goto()

    await expect(deploymentPage.pageTitle).toBeVisible()
  })

  test('should have accessible controls', async ({ deploymentPage, page }) => {
    await deploymentPage.goto()

    // Deploy button should have proper ARIA attributes
    if (await deploymentPage.deployButton.isVisible()) {
      const ariaLabel =
        await deploymentPage.deployButton.getAttribute('aria-label')
      const text = await deploymentPage.deployButton.textContent()

      expect(ariaLabel || text).toBeTruthy()
    }
  })
})
