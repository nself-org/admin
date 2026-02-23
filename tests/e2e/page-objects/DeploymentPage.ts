import { type Locator, type Page, expect } from '@playwright/test'

export class DeploymentPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly environmentSelector: Locator
  readonly configSection: Locator
  readonly deployButton: Locator
  readonly deploymentLogs: Locator
  readonly deploymentStatus: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1')
    this.environmentSelector = page.locator(
      '[data-testid="environment-selector"]',
    )
    this.configSection = page.locator('[data-testid="deployment-config"]')
    this.deployButton = page.locator('button:has-text("Deploy")')
    this.deploymentLogs = page.locator('[data-testid="deployment-logs"]')
    this.deploymentStatus = page.locator('[data-testid="deployment-status"]')
  }

  async goto() {
    await this.page.goto('/deployment')
  }

  async gotoStaging() {
    await this.page.goto('/deployment/staging')
  }

  async gotoProduction() {
    await this.page.goto('/deployment/prod')
  }

  async selectEnvironment(env: string) {
    await this.environmentSelector.click()
    await this.page.click(`[role="option"]:has-text("${env}")`)
  }

  async configureDeployment(options: Record<string, string>) {
    for (const [key, value] of Object.entries(options)) {
      await this.page.fill(`[data-config="${key}"]`, value)
    }
  }

  async deploy() {
    await this.deployButton.click()
  }

  async expectDeploymentLogsVisible() {
    await expect(this.deploymentLogs).toBeVisible()
  }

  async expectDeploymentSuccess() {
    await expect(this.deploymentStatus).toContainText(/success|complete/i, {
      timeout: 120000,
    })
  }

  async expectDeploymentError() {
    await expect(this.deploymentStatus).toContainText(/error|failed/i, {
      timeout: 60000,
    })
  }
}
