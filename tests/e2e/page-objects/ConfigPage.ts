import { type Locator, type Page, expect } from '@playwright/test'

export class ConfigPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly envTabs: Locator
  readonly addVariableButton: Locator
  readonly saveButton: Locator
  readonly variablesList: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1')
    this.envTabs = page.locator('[role="tablist"]')
    this.addVariableButton = page.locator('button:has-text("Add Variable")')
    this.saveButton = page.locator('button:has-text("Save")')
    this.variablesList = page.locator('[data-testid="variables-list"]')
  }

  async goto() {
    await this.page.goto('/config')
  }

  async gotoEnv() {
    await this.page.goto('/config/env')
  }

  async switchEnvironment(env: string) {
    await this.page.click(`[role="tab"]:has-text("${env}")`)
  }

  async addVariable(key: string, value: string) {
    await this.addVariableButton.click()
    await this.page.fill('[data-testid="variable-key"]', key)
    await this.page.fill('[data-testid="variable-value"]', value)
    await this.page.click('button:has-text("Add")')
  }

  async editVariable(key: string, newValue: string) {
    const variableRow = this.page.locator(`[data-testid="variable-row"][data-key="${key}"]`)
    await variableRow.locator('button:has-text("Edit")').click()
    await this.page.fill('[data-testid="variable-value"]', newValue)
    await this.page.click('button:has-text("Save")')
  }

  async deleteVariable(key: string) {
    const variableRow = this.page.locator(`[data-testid="variable-row"][data-key="${key}"]`)
    await variableRow.locator('button:has-text("Delete")').click()
    await this.page.click('button:has-text("Confirm")')
  }

  async saveChanges() {
    await this.saveButton.click()
    await expect(this.page.locator('[role="alert"]')).toContainText(/saved/i)
  }

  async expectVariableExists(key: string) {
    await expect(this.page.locator(`[data-testid="variable-row"][data-key="${key}"]`)).toBeVisible()
  }

  async expectVariableNotExists(key: string) {
    await expect(
      this.page.locator(`[data-testid="variable-row"][data-key="${key}"]`)
    ).not.toBeVisible()
  }
}
