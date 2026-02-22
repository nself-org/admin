import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Logs Viewer Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should open logs viewer', async ({ logsPage }) => {
    await logsPage.goto()
    await expect(logsPage.pageTitle).toBeVisible()
    await expect(logsPage.page).toHaveURL(/\/logs|\/system\/logs/)
  })

  test('should select service', async ({ logsPage, page }) => {
    await logsPage.goto()

    if (await logsPage.serviceSelector.isVisible()) {
      await logsPage.selectService('postgres')

      // Logs should load for selected service
      await logsPage.expectLogsVisible()
    }
  })

  test('should filter by log level', async ({ logsPage, page }) => {
    await logsPage.goto()

    if (await logsPage.levelFilter.isVisible()) {
      await logsPage.filterByLevel('error')

      // Should show only error logs
      await page.waitForTimeout(1000)

      const logsContent = await logsPage.logsContainer.textContent()
      expect(logsContent).toBeTruthy()
    }
  })

  test.skip('should search logs', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires [data-testid="logs-container"] which needs
    // a live WebSocket log stream from a running nself backend. CI has no nself backend.
    await logsPage.goto()

    await logsPage.expectLogsVisible()

    // Search for specific text
    if (await logsPage.searchInput.isVisible()) {
      await logsPage.searchLogs('error')

      // Wait for search to filter results
      await page.waitForTimeout(1000)

      // Logs should contain search term
      const logsContent = await logsPage.logsContainer.textContent()
      if (logsContent) {
        expect(logsContent.toLowerCase()).toContain('error')
      }
    }
  })

  test.skip('should download logs', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await logsPage.goto()
    await logsPage.expectLogsVisible()

    if (await logsPage.downloadButton.isVisible()) {
      const download = await logsPage.downloadLogs()

      // Should download a log file
      expect(download.suggestedFilename()).toMatch(/\.(log|txt)$/)
    }
  })

  test('should toggle real-time log streaming', async ({ logsPage, page }) => {
    await logsPage.goto()

    if (await logsPage.streamToggle.isVisible()) {
      // Enable streaming
      await logsPage.toggleRealTimeStream()

      // Should show streaming indicator
      await expect(
        page.locator('[data-testid="streaming-indicator"]'),
      ).toBeVisible()

      // Wait a bit to see if new logs appear
      await page.waitForTimeout(2000)

      // Disable streaming
      await logsPage.toggleRealTimeStream()
    }
  })

  test.skip('should show log timestamps', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await logsPage.goto()
    await logsPage.expectLogsVisible()

    // Check if logs have timestamps
    const logLines = page.locator('[data-testid="log-line"]')

    if ((await logLines.count()) > 0) {
      const firstLog = logLines.first()
      const timestamp = firstLog.locator('[data-testid="log-timestamp"]')

      if (await timestamp.isVisible()) {
        const timestampText = await timestamp.textContent()
        expect(timestampText).toMatch(/\d{2}:\d{2}/)
      }
    }
  })

  test.skip('should support log level colors', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await logsPage.goto()
    await logsPage.expectLogsVisible()

    // Error logs should have distinct styling
    const errorLogs = page.locator('[data-log-level="error"]')

    if ((await errorLogs.count()) > 0) {
      const firstError = errorLogs.first()
      const className = await firstError.getAttribute('class')

      expect(className).toContain('error')
    }
  })

  test.skip('should auto-scroll to latest logs', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await logsPage.goto()
    await logsPage.expectLogsVisible()

    // Enable auto-scroll if available
    const autoScrollToggle = page.locator('[data-testid="auto-scroll-toggle"]')

    if (await autoScrollToggle.isVisible()) {
      await autoScrollToggle.click()

      // Should scroll to bottom
      await page.waitForTimeout(1000)

      const logsContainer = await page.locator('[data-testid="logs-container"]')
      const scrollTop = await logsContainer.evaluate(
        (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 10,
      )

      expect(scrollTop).toBe(true)
    }
  })

  test.skip('should copy log lines', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await logsPage.goto()
    await logsPage.expectLogsVisible()

    const logLine = page.locator('[data-testid="log-line"]').first()

    if (await logLine.isVisible()) {
      // Look for copy button
      const copyButton = logLine.locator('button[aria-label*="Copy"]')

      if (await copyButton.isVisible()) {
        await copyButton.click()

        // Should show copied confirmation
        await expect(page.locator('[role="alert"]')).toContainText(/copied/i)
      }
    }
  })

  test.skip('should be responsive on mobile', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await page.setViewportSize({ width: 375, height: 667 })
    await logsPage.goto()

    await expect(logsPage.pageTitle).toBeVisible()
    await logsPage.expectLogsVisible()
  })

  test.skip('should support keyboard shortcuts', async ({ logsPage, page }) => {
    // Skipped: expectLogsVisible() requires live log stream from nself backend.
    await logsPage.goto()
    await logsPage.expectLogsVisible()

    // Focus search input with /
    await page.keyboard.press('/')

    if (await logsPage.searchInput.isVisible()) {
      await expect(logsPage.searchInput).toBeFocused()
    }
  })
})
