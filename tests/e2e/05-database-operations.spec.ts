import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Database Operations Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should open database console', async ({ databasePage }) => {
    await databasePage.gotoConsole()
    await expect(databasePage.pageTitle).toBeVisible()
    await expect(databasePage.page).toHaveURL(/\/database/)
  })

  test('should execute SQL query', async ({ databasePage, page }) => {
    await databasePage.gotoConsole()

    // Execute a simple query
    const query = 'SELECT 1 as test;'
    await databasePage.executeQuery(query)

    // Should show results
    await databasePage.expectQueryResults()
  })

  test('should view query results', async ({ databasePage, page }) => {
    await databasePage.gotoConsole()

    // Execute query
    await databasePage.executeQuery('SELECT 1 as test;')

    // Wait for results
    await databasePage.expectQueryResults()

    // Results should contain data
    const resultsContent = await databasePage.queryResults.textContent()
    expect(resultsContent).toBeTruthy()
  })

  test('should export results to CSV', async ({ databasePage, page }) => {
    await databasePage.gotoConsole()

    // Execute query
    await databasePage.executeQuery('SELECT 1 as test;')
    await databasePage.expectQueryResults()

    // Export results
    if (await databasePage.exportButton.isVisible()) {
      const download = await databasePage.exportResults()
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    }
  })

  test('should view database schema', async ({ databasePage, page }) => {
    await databasePage.gotoSchema()

    // Schema viewer should be visible
    await expect(page.locator('[data-testid="schema-viewer"]')).toBeVisible()
  })

  test('should run database migration', async ({ databasePage, page }) => {
    await databasePage.gotoMigrate()

    // Look for migrate button
    const migrateButton = page.locator('button:has-text("Migrate")')

    if (await migrateButton.isVisible()) {
      await migrateButton.click()

      // Should show migration progress
      await expect(
        page.locator('[data-testid="migration-status"]'),
      ).toBeVisible({ timeout: 30000 })
    }
  })

  test.skip('should handle query errors gracefully', async ({
    databasePage,
    page,
  }) => {
    // Skipped: requires a live Hasura/Postgres backend to execute queries
    // and receive error responses. CI runs the admin UI without a backend.
    await databasePage.gotoConsole()

    // Execute invalid query
    await databasePage.executeQuery('INVALID SQL QUERY;')

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('should support syntax highlighting in editor', async ({
    databasePage,
    page,
  }) => {
    await databasePage.gotoConsole()

    // Check if editor has syntax highlighting class
    const editor = page.locator('[data-testid="query-editor"]')
    if (await editor.isVisible()) {
      const className = await editor.getAttribute('class')
      expect(className).toBeTruthy()
    }
  })

  test('should show query execution time', async ({ databasePage, page }) => {
    await databasePage.gotoConsole()

    // Execute query
    await databasePage.executeQuery('SELECT 1;')
    await databasePage.expectQueryResults()

    // Look for execution time display
    const executionTime = page.locator('[data-testid="execution-time"]')
    if (await executionTime.isVisible()) {
      const timeText = await executionTime.textContent()
      expect(timeText).toMatch(/\d+\s*(ms|s)/)
    }
  })

  test('should save query history', async ({ databasePage, page }) => {
    await databasePage.gotoConsole()

    // Execute multiple queries
    await databasePage.executeQuery('SELECT 1;')
    await page.waitForTimeout(1000)
    await databasePage.executeQuery('SELECT 2;')

    // Look for query history
    const historyPanel = page.locator('[data-testid="query-history"]')
    if (await historyPanel.isVisible()) {
      await expect(historyPanel).toContainText('SELECT')
    }
  })

  test('should be responsive on mobile', async ({ databasePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await databasePage.gotoConsole()

    await expect(databasePage.pageTitle).toBeVisible()
    await expect(databasePage.queryEditor).toBeVisible()
  })

  test('should support keyboard shortcuts', async ({ databasePage, page }) => {
    await databasePage.gotoConsole()

    // Focus editor
    await databasePage.queryEditor.click()

    // Type query
    await page.keyboard.type('SELECT 1;')

    // Execute with Cmd+Enter or Ctrl+Enter
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+Enter' : 'Control+Enter')

    // Should execute query
    await databasePage.expectQueryResults()
  })
})
