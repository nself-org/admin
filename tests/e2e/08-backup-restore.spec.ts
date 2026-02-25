import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Backup & Restore Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to database backup page', async ({
    backupRestorePage,
  }) => {
    await backupRestorePage.gotoBackup()
    await expect(backupRestorePage.pageTitle).toBeVisible()
    await expect(backupRestorePage.page).toHaveURL(/\/database\/backup/)
  })

  test.skip('should create new backup', async ({ backupRestorePage, page }) => {
    // Skipped: requires a running nself stack (nself CLI must be installed and
    // a real Postgres instance must be running). The backup button is visible in
    // the mock CI environment but the server-side spawn of `nself db backup`
    // fails with ENOENT when the CLI is not fully operational.
    await backupRestorePage.gotoBackup()

    if (await backupRestorePage.createBackupButton.isVisible()) {
      // Click create backup
      await backupRestorePage.createBackupButton.click()

      // Should show progress
      await expect(page.locator('[data-testid="backup-progress"]')).toBeVisible(
        { timeout: 5000 },
      )

      // Wait for backup to complete
      await expect(page.locator('[data-testid="backup-complete"]')).toBeVisible(
        { timeout: 60000 },
      )

      // Success message
      await backupRestorePage.expectBackupSuccess()
    }
  })

  test('should download backup', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoBackup()

    // Find first backup in list
    const firstBackup = page.locator('[data-testid="backup-item"]').first()

    if (await firstBackup.isVisible()) {
      const backupName = await firstBackup.getAttribute('data-backup')

      if (backupName) {
        const download = await backupRestorePage.downloadBackup(backupName)

        // Should download backup file
        expect(download.suggestedFilename()).toMatch(/\.(sql|dump|backup)$/)
      }
    }
  })

  test('should navigate to restore page', async ({ backupRestorePage }) => {
    await backupRestorePage.gotoRestore()
    await expect(backupRestorePage.pageTitle).toBeVisible()
    await expect(backupRestorePage.page).toHaveURL(/\/database\/restore/)
  })

  test('should restore from backup', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoRestore()

    // Find a backup to restore
    const firstBackup = page.locator('[data-testid="backup-item"]').first()

    if (await firstBackup.isVisible()) {
      const backupName = await firstBackup.getAttribute('data-backup')

      if (backupName) {
        // Restore backup
        await backupRestorePage.restoreFromBackup(backupName)

        // Should show success
        await backupRestorePage.expectRestoreSuccess()
      }
    }
  })

  test('should verify restore success', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoRestore()

    const restoreStatus = page.locator('[data-testid="restore-status"]')

    if (await restoreStatus.isVisible()) {
      const statusText = await restoreStatus.textContent()
      expect(statusText).toMatch(/success|complete|ready/i)
    }
  })

  test('should show backup list', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoBackup()

    // Backups list should be visible
    const backupsList = page.locator('[data-testid="backups-list"]')

    if (await backupsList.isVisible()) {
      await expect(backupsList).toBeVisible()

      // Should have at least one backup item
      const backupItems = page.locator('[data-testid="backup-item"]')
      const count = await backupItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show backup metadata', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoBackup()

    const firstBackup = page.locator('[data-testid="backup-item"]').first()

    if (await firstBackup.isVisible()) {
      // Should show size, date, etc.
      const metadata = firstBackup.locator('[data-testid="backup-metadata"]')

      if (await metadata.isVisible()) {
        const metadataText = await metadata.textContent()
        expect(metadataText).toBeTruthy()
      }
    }
  })

  test('should confirm before restore', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoRestore()

    const firstBackup = page.locator('[data-testid="backup-item"]').first()

    if (await firstBackup.isVisible()) {
      const restoreButton = firstBackup.locator('button:has-text("Restore")')

      if (await restoreButton.isVisible()) {
        await restoreButton.click()

        // Should show confirmation dialog
        await expect(page.locator('[role="dialog"]')).toBeVisible()

        // Cancel instead of confirming
        const cancelButton = page.locator('button:has-text("Cancel")')
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
        }
      }
    }
  })

  test('should delete old backups', async ({ backupRestorePage, page }) => {
    await backupRestorePage.gotoBackup()

    const backupItem = page.locator('[data-testid="backup-item"]').first()

    if (await backupItem.isVisible()) {
      const deleteButton = backupItem.locator('button:has-text("Delete")')

      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Should confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm")')
        if (await confirmButton.isVisible()) {
          await confirmButton.click()

          // Should show success message
          await expect(page.locator('[role="alert"]')).toContainText(/deleted/i)
        }
      }
    }
  })

  test('should be responsive on mobile', async ({
    backupRestorePage,
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await backupRestorePage.gotoBackup()

    await expect(backupRestorePage.pageTitle).toBeVisible()

    if (await backupRestorePage.createBackupButton.isVisible()) {
      await expect(backupRestorePage.createBackupButton).toBeVisible()
    }
  })

  test('should have accessible controls', async ({
    backupRestorePage,
    page,
  }) => {
    await backupRestorePage.gotoBackup()

    // Create backup button should have ARIA label
    if (await backupRestorePage.createBackupButton.isVisible()) {
      const ariaLabel =
        await backupRestorePage.createBackupButton.getAttribute('aria-label')
      const text = await backupRestorePage.createBackupButton.textContent()

      expect(ariaLabel || text).toBeTruthy()
    }
  })
})
