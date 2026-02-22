import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Build Project Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to build page', async ({ buildPage }) => {
    await buildPage.goto()
    await expect(buildPage.pageTitle).toBeVisible()
    await expect(buildPage.page).toHaveURL(/\/build/)
  })

  test('should run pre-build checks', async ({ buildPage }) => {
    await buildPage.goto()

    // Click pre-check button if visible
    if (await buildPage.preCheckButton.isVisible()) {
      await buildPage.preCheckButton.click()

      // Wait for pre-check to complete
      await buildPage.page.waitForSelector(
        '[data-testid*="check"]:has-text("complete")',
        { timeout: 30000 },
      )
    }
  })

  test.skip('should execute build', async ({ buildPage }) => {
    // Skipped: requires a running nself CLI installation. The build triggers
    // a real nself build subprocess; without it the build-logs element never
    // appears and the test times out at 31 s in CI.
    await buildPage.goto()
    await buildPage.runBuild()
    await buildPage.expectBuildLogsVisible()
  })

  test.skip('should view build logs in real-time', async ({
    buildPage,
    page,
  }) => {
    // Skipped: requires a running nself CLI installation.
    await buildPage.goto()
    await buildPage.runBuild()
    await expect(buildPage.buildLogs).toBeVisible()
    await page.waitForTimeout(2000)
    const logsContent = await buildPage.buildLogs.textContent()
    expect(logsContent).toBeTruthy()
  })

  test('should handle build errors gracefully', async ({ buildPage }) => {
    await buildPage.goto()

    // Note: This test would need a way to trigger a build error
    // For now, we just verify error handling UI exists
    const errorAlert = buildPage.page.locator('[role="alert"]')
    await expect(errorAlert).toBeAttached()
  })

  test.skip('should show build progress indicator', async ({
    buildPage,
    page,
  }) => {
    // Skipped: requires a running nself CLI installation. runBuild() triggers
    // an API call to nself which times out in CI (no nself binary installed).
    await buildPage.goto()
    await buildPage.runBuild()
    const progressIndicators = [
      '[data-testid="build-progress"]',
      '[role="progressbar"]',
      '[data-testid="loading-spinner"]',
    ]
    let found = false
    for (const selector of progressIndicators) {
      if (await page.locator(selector).isVisible()) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  test('should be responsive on mobile', async ({ buildPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await buildPage.goto()

    await expect(buildPage.pageTitle).toBeVisible()
    await expect(buildPage.buildButton).toBeVisible()
  })

  test('should support keyboard navigation', async ({ buildPage, page }) => {
    await buildPage.goto()

    // Wait for page to load (exit 'checking' skeleton state — API pre-build
    // checks must complete before the h1 and buttons render).
    await expect(buildPage.pageTitle).toBeVisible({ timeout: 30000 })

    // Click h1 to establish page focus — Firefox requires a prior user gesture
    // before keyboard Tab events propagate to page elements.
    await buildPage.pageTitle.click()

    // Tab to first interactive element
    await page.keyboard.press('Tab')

    // Verify something on the page received focus (a button, link, or input).
    // Avoid evaluating specific button locators by name — the build page may
    // render different buttons depending on pre-build check results.
    const focusedTag = await page.evaluate(
      () => document.activeElement?.tagName ?? '',
    )
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(
      focusedTag,
    )
  })

  test('should display build configuration', async ({ buildPage, page }) => {
    await buildPage.goto()

    // Check for configuration display
    const configSection = page.locator('[data-testid="build-config"]')
    if (await configSection.isVisible()) {
      await expect(configSection).toBeVisible()
    }
  })

  test.skip('should allow canceling build', async ({ buildPage, page }) => {
    // Skipped: requires a running nself CLI installation. runBuild() triggers
    // an API call to nself which times out in CI (no nself binary installed).
    await buildPage.goto()
    await buildPage.runBuild()
    const cancelButton = page.locator('button:has-text("Cancel")')
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      await expect(page.locator('[data-testid="build-status"]')).toContainText(
        /cancel/i,
      )
    }
  })
})
