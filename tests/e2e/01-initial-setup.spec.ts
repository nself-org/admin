import { expect, test } from './fixtures'
import { clearAppState, TEST_PASSWORD } from './helpers'

test.describe('Initial Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test('should complete first-time password setup', async ({ loginPage }) => {
    // globalSetup pre-configures the admin password in CI so the server starts
    // in login mode, not setup mode.  This test is only valid on a truly fresh
    // server that has no password set.
    test.skip(
      !!process.env.CI,
      'Skipped in CI: globalSetup pre-sets the admin password before tests run',
    )

    await loginPage.goto()
    await loginPage.expectSetupMode()

    // Setup password
    await loginPage.setupPassword(TEST_PASSWORD)

    // Should redirect after successful setup
    await loginPage.expectLoginSuccess()
  })

  test('should login with newly created password', async ({ loginPage }) => {
    await loginPage.goto()

    // Should show login form (not setup)
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()

    // Login with password
    await loginPage.login(TEST_PASSWORD)
    await loginPage.expectLoginSuccess()
  })

  test('should navigate to dashboard after login', async ({
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.goto()
    await loginPage.login(TEST_PASSWORD)

    // Should be on dashboard or initial setup page
    await dashboardPage.expectDashboardLoaded()
  })

  test('should display login form on mobile', async ({ loginPage, page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await loginPage.goto()

    // The form should be visible and usable on mobile regardless of mode.
    // (Setup completes in test 1, so by this test the server is in login mode.)
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()
  })

  test('should validate password requirements', async ({ loginPage, page }) => {
    await loginPage.goto()

    // Try weak password
    await loginPage.passwordInput.fill('123')
    await loginPage.submitButton.click()

    // Should show error for weak password
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('should have accessible form elements', async ({ loginPage, page }) => {
    await loginPage.goto()

    // Check ARIA labels
    const passwordLabel =
      await loginPage.passwordInput.getAttribute('aria-label')
    expect(passwordLabel).toBeTruthy()

    // Test keyboard navigation.
    // Click h1 first to establish page focus — Firefox requires a prior user
    // gesture before keyboard Tab events propagate to page elements.
    await page.locator('h1').click()
    await page.keyboard.press('Tab')
    await expect(loginPage.passwordInput).toBeFocused()

    // Tab past intermediate field (rememberMe in login mode, confirmPassword in
    // setup mode) then one more Tab to reach the submit button.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(loginPage.submitButton).toBeFocused()
  })
})
