import { expect, test } from './fixtures'
import { clearAppState, TEST_PASSWORD } from './helpers'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test('should login with correct password', async ({ loginPage }) => {
    await loginPage.goto()
    await loginPage.login(TEST_PASSWORD)
    await loginPage.expectLoginSuccess()
  })

  test('should show error for wrong password', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.login('wrongpassword')

    // Should show error message
    await loginPage.expectLoginError()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should implement rate limiting', async ({ loginPage, page }) => {
    // Skip in CI: this test triggers IP-based rate limiting which blocks subsequent
    // login attempts across the entire test suite for the 15-minute window.
    // The rate limiter uses in-memory state shared by the Next.js dev server.
    test.skip(
      !!process.env.CI,
      'Skipped in CI: triggers shared rate limit state that blocks subsequent tests',
    )

    await loginPage.goto()

    // Try multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await loginPage.login('wrongpassword')
      await page.waitForTimeout(500)
    }

    // Should show rate limit error
    await expect(page.locator('[role="alert"]')).toContainText(
      /rate limit|too many|wait/i,
    )
  })

  test('should logout successfully', async ({ loginPage, dashboardPage }) => {
    // Login first
    await loginPage.goto()
    await loginPage.login(TEST_PASSWORD)
    await loginPage.expectLoginSuccess()

    // Navigate to dashboard
    await dashboardPage.goto()

    // Logout
    await dashboardPage.logout()

    // Should redirect to login
    await expect(loginPage.page).toHaveURL(/\/login/)
  })

  test('should persist session on page reload', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.login(TEST_PASSWORD)
    await loginPage.expectLoginSuccess()

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should handle session expiry', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.login(TEST_PASSWORD)
    await loginPage.expectLoginSuccess()

    // Clear cookies to simulate expired session
    await page.context().clearCookies()

    // Try to access protected page
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show password visibility toggle', async ({ loginPage }) => {
    await loginPage.goto()

    // Check for password visibility toggle button
    const toggleButton = loginPage.page.locator(
      'button[aria-label*="password"]',
    )
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
      // Password input should change type
      const inputType = await loginPage.passwordInput.getAttribute('type')
      expect(inputType).toBe('text')
    }
  })

  test('should work on mobile devices', async ({ loginPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await loginPage.goto()
    await loginPage.login(TEST_PASSWORD)
    await loginPage.expectLoginSuccess()
  })

  test('should support keyboard navigation', async ({ loginPage, page }) => {
    await loginPage.goto()

    // Click h1 first to establish page focus — Firefox requires a prior user
    // gesture before keyboard Tab events propagate to page elements.
    await page.locator('h1').click()

    // Tab to password input
    await page.keyboard.press('Tab')
    await expect(loginPage.passwordInput).toBeFocused()

    // Type password
    await page.keyboard.type(TEST_PASSWORD)

    // Tab past intermediate field (rememberMe in login mode) then to submit.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(loginPage.submitButton).toBeFocused()

    // Submit with Enter
    await page.keyboard.press('Enter')
    await loginPage.expectLoginSuccess()
  })
})
