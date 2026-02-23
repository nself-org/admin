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
    // Wait for post-login navigation to complete before checking the URL.
    // The default expect.timeout (5 s) is too short for the full auth chain
    // (CSRF fetch → login API → project/status → router.push → middleware).
    // With pre-warmed routes the chain takes ~2 s, but we budget 20 s for
    // safety.  Check URL first so we wait for navigation before asserting
    // that the page title is visible (the login page h1 is also visible, so
    // checking title first would give a false positive).
    //
    // Accept any valid post-login route: / (dashboard), /build (not initialized),
    // or /start (initialized but not running). CI without nself routes to /build.
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 20000 })
    await expect(this.pageTitle).toBeVisible()
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
