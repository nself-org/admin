import { type Locator, type Page, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator
  readonly welcomeHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.passwordInput = page.locator('#password')
    this.submitButton = page.locator('button[type="submit"]')
    this.errorMessage = page.locator('[role="alert"]')
    this.welcomeHeading = page.locator('h1')
  }

  async goto() {
    // waitUntil: 'networkidle' ensures all Next.js JS bundles are downloaded
    // and the /api/auth/init fetch has completed before returning.  Without
    // this, Playwright can click the submit button before React has hydrated —
    // causing the native form submit (page reload to /login) to fire instead
    // of the React onClick handler.
    await this.page.goto('/login', { waitUntil: 'networkidle' })
    // The password input starts disabled while /api/auth/init is in flight
    // (isCheckingSetup === true).  Explicitly wait for it to become enabled so
    // the caller can immediately call fill() without risking a stale-element
    // interaction before React's state update renders.
    await this.page.waitForSelector('#password:not([disabled])', {
      state: 'visible',
      timeout: 15000,
    })
  }

  async login(password: string) {
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async setupPassword(password: string) {
    await this.passwordInput.fill(password)
    // Setup mode requires a confirm password field — fill it too
    const confirmInput = this.page.locator('#confirmPassword')
    if (await confirmInput.isVisible()) {
      await confirmInput.fill(password)
    }
    await this.submitButton.click()
  }

  async expectLoginSuccess() {
    // Use strict regex with $ anchor so /login never matches.
    // Longer timeout: login → CSRF fetch → /api/auth/init or /api/auth/login
    // → getCorrectRoute() fetch → router.push() → Next.js navigation — can take 5-10s in CI.
    await expect(this.page).toHaveURL(/\/(dashboard|build|start)?$/, {
      timeout: 25000,
    })
  }

  async expectLoginError() {
    await expect(this.errorMessage).toBeVisible()
  }

  async expectSetupMode() {
    // Use longer timeout: /api/auth/init cold-start can take 7+ seconds in CI
    await expect(this.welcomeHeading).toContainText(/Welcome|Setup/, {
      timeout: 15000,
    })
  }
}
