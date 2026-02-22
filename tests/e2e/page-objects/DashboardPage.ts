import { type Locator, type Page, expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly serviceCards: Locator
  readonly logoutButton: Locator
  readonly sidebarNav: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1')
    this.serviceCards = page.locator('[data-testid="service-card"]')
    this.logoutButton = page.locator('button:has-text("Logout")')
    this.sidebarNav = page.locator('nav')
  }

  async goto() {
    await this.page.goto('/')
  }

  async expectDashboardLoaded() {
    await expect(this.pageTitle).toBeVisible()
    // Accept any valid post-login route: / (dashboard), /build (not initialized),
    // or /start (initialized but not running). CI without nself routes to /build.
    await expect(this.page).toHaveURL(/\/(build|start)?$/)
  }

  async logout() {
    await this.logoutButton.click()
  }

  async navigateToService(serviceName: string) {
    await this.page.click(`text=${serviceName}`)
  }

  async navigateToPage(pagePath: string) {
    await this.page.goto(pagePath)
  }
}
