import { type Locator, type Page, expect } from '@playwright/test'

export class BuildPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly preCheckButton: Locator
  readonly buildButton: Locator
  readonly buildLogs: Locator
  readonly buildStatus: Locator
  readonly errorAlert: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1')
    this.preCheckButton = page.locator('button:has-text("Pre-Check")')
    this.buildButton = page.locator('button:has-text("Build")')
    this.buildLogs = page.locator('[data-testid="build-logs"]')
    this.buildStatus = page.locator('[data-testid="build-status"]')
    this.errorAlert = page.locator('[role="alert"]')
  }

  async goto() {
    // waitUntil: 'commit' so the goto resolves as soon as the first
    // response commits, even if the middleware issues a redirect to
    // /login (which WebKit would otherwise surface as "Navigation
    // interrupted by another navigation").
    await this.page.goto('/build', { waitUntil: 'commit' })
  }

  async runPreCheck() {
    await this.preCheckButton.click()
    // Wait for pre-check to complete
    await this.page.waitForSelector('[data-testid="precheck-complete"]', {
      timeout: 30000,
    })
  }

  async runBuild() {
    await this.buildButton.click()
  }

  async expectBuildSuccess() {
    await expect(this.buildStatus).toContainText(/success|complete/i, {
      timeout: 60000,
    })
  }

  async expectBuildError() {
    await expect(this.errorAlert).toBeVisible()
  }

  async expectBuildLogsVisible() {
    await expect(this.buildLogs).toBeVisible()
  }
}
