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
    await this.page.goto('/login')
  }

  async login(password: string) {
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async setupPassword(password: string) {
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL(/\/(dashboard|build|start)?/)
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
