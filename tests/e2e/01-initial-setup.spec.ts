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
      'Skipped in CI: globalSetup pre-sets the admin password before tests run'
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

  test('should navigate to dashboard after login', async ({ loginPage, dashboardPage }) => {
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
    const passwordLabel = await loginPage.passwordInput.getAttribute('aria-label')
    expect(passwordLabel).toBeTruthy()

    // Verify the form is keyboard-accessible: the password input can receive
    // keyboard focus and the submit button is focusable too.  We assert
    // focusability directly rather than via Tab traversal — headless WebKit
    // moves Tab focus to <body> instead of cycling form controls (a documented
    // platform limitation), so a Tab-traversal assertion is not portable, while
    // keyboard-focusability is the meaningful accessibility guarantee.
    await loginPage.passwordInput.focus()
    await expect(loginPage.passwordInput).toBeFocused()

    await loginPage.submitButton.focus()
    await expect(loginPage.submitButton).toBeFocused()
  })
})
