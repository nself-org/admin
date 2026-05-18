import { type Locator, type Page, expect } from '@playwright/test'

export class ServicesPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly servicesList: Locator
  readonly startButton: Locator
  readonly stopButton: Locator
  readonly restartButton: Locator
  readonly logsButton: Locator
  readonly logsViewer: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1')
    this.servicesList = page.locator('[data-testid="services-list"]')
    this.startButton = page.locator('button:has-text("Start")')
    this.stopButton = page.locator('button:has-text("Stop")')
    this.restartButton = page.locator('button:has-text("Restart")')
    this.logsButton = page.locator('button:has-text("Logs")')
    this.logsViewer = page.locator('[data-testid="logs-viewer"]')
  }

  async goto() {
    await this.page.goto('/services')
  }

  async gotoService(serviceName: string) {
    await this.page.goto(`/services/${serviceName}`)
  }

  async startService(serviceName?: string) {
    if (serviceName) {
      await this.page.click(`[data-service="${serviceName}"] button:has-text("Start")`)
    } else {
      await this.startButton.first().click()
    }
  }

  async stopService(serviceName?: string) {
    if (serviceName) {
      await this.page.click(`[data-service="${serviceName}"] button:has-text("Stop")`)
    } else {
      await this.stopButton.first().click()
    }
  }

  async restartService(serviceName?: string) {
    if (serviceName) {
      await this.page.click(`[data-service="${serviceName}"] button:has-text("Restart")`)
    } else {
      await this.restartButton.first().click()
    }
  }

  async viewLogs(serviceName?: string) {
    if (serviceName) {
      await this.page.click(`[data-service="${serviceName}"] button:has-text("Logs")`)
    } else {
      await this.logsButton.first().click()
    }
    await expect(this.logsViewer).toBeVisible()
  }

  async expectServiceStatus(serviceName: string, status: string) {
    const serviceCard = this.page.locator(`[data-service="${serviceName}"]`)
    await expect(serviceCard).toContainText(status)
  }
}
