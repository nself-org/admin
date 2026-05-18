import { type Locator, type Page, expect } from '@playwright/test'

export class BackupRestorePage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly createBackupButton: Locator
  readonly backupsList: Locator
  readonly downloadButton: Locator
  readonly restoreButton: Locator
  readonly fileInput: Locator
  readonly restoreStatus: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1')
    this.createBackupButton = page.locator('button:has-text("Create Backup")')
    this.backupsList = page.locator('[data-testid="backups-list"]')
    this.downloadButton = page.locator('button:has-text("Download")')
    this.restoreButton = page.locator('button:has-text("Restore")')
    this.fileInput = page.locator('input[type="file"]')
    this.restoreStatus = page.locator('[data-testid="restore-status"]')
  }

  async gotoBackup() {
    await this.page.goto('/database/backup')
  }

  async gotoRestore() {
    await this.page.goto('/database/restore')
  }

  async createBackup() {
    await this.createBackupButton.click()
    // Wait for backup to complete
    await this.page.waitForSelector('[data-testid="backup-complete"]', {
      timeout: 60000,
    })
  }

  async downloadBackup(backupName: string) {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click(`[data-backup="${backupName}"] button:has-text("Download")`)
    const download = await downloadPromise
    return download
  }

  async restoreFromBackup(backupName: string) {
    await this.page.click(`[data-backup="${backupName}"] button:has-text("Restore")`)
    await this.page.click('button:has-text("Confirm")')
    // Wait for restore to complete
    await this.page.waitForSelector('[data-testid="restore-complete"]', {
      timeout: 60000,
    })
  }

  async uploadBackupFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath)
    await this.restoreButton.click()
  }

  async expectBackupSuccess() {
    await expect(this.page.locator('[role="alert"]')).toContainText(/backup.*success/i)
  }

  async expectRestoreSuccess() {
    await expect(this.restoreStatus).toContainText(/success|complete/i, {
      timeout: 60000,
    })
  }
}
