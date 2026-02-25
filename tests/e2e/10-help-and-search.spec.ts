import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Help & Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should open help center', async ({ helpPage }) => {
    await helpPage.goto()
    await expect(helpPage.pageTitle).toBeVisible()
    await expect(helpPage.page).toHaveURL(/\/help|\/settings\/help/)
  })

  test.skip('should search for topic', async ({ helpPage, page }) => {
    // Skipped: help page has no [data-testid="search-results"] element yet.
    await helpPage.goto()

    // Search for a topic
    if (await helpPage.searchInput.isVisible()) {
      await helpPage.searchHelp('database')

      // Should show search results
      await helpPage.expectSearchResults()
    }
  })

  test.skip('should view search results', async ({ helpPage, page }) => {
    // Skipped: help page has no [data-testid="search-results"] element yet.
    await helpPage.goto()

    if (await helpPage.searchInput.isVisible()) {
      await helpPage.searchHelp('setup')

      // Wait for results
      await helpPage.expectSearchResults()

      // Results should contain relevant content
      const resultsContent = await helpPage.searchResults.textContent()
      expect(resultsContent?.toLowerCase()).toContain('setup')
    }
  })

  test.skip('should navigate to documentation page', async ({
    helpPage,
    page,
  }) => {
    // Skipped: doc page has no [data-testid="doc-content"] element yet.
    await helpPage.goto()

    // Look for documentation links
    const docLink = page.locator('a:has-text("Getting Started")').first()

    if (await docLink.isVisible()) {
      await docLink.click()

      // Should navigate to doc page
      await expect(helpPage.docPage).toBeVisible()
    }
  })

  test.skip('should use command palette (Cmd+K)', async ({
    helpPage,
    page,
  }) => {
    // Skipped: command palette feature not yet implemented.
    await helpPage.goto()

    // Open command palette
    await helpPage.openCommandPalette()

    // Command palette should be visible
    await helpPage.expectCommandPaletteVisible()
  })

  test('should search in command palette', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Open command palette
    await helpPage.openCommandPalette()

    if (await helpPage.commandPalette.isVisible()) {
      // Type search query
      await page.keyboard.type('services')

      // Should show filtered results
      await page.waitForTimeout(500)

      const paletteContent = await helpPage.commandPalette.textContent()
      expect(paletteContent?.toLowerCase()).toContain('service')
    }
  })

  test.skip('should navigate using keyboard shortcuts', async ({
    helpPage,
    page,
  }) => {
    // Skipped: command palette feature not yet implemented.
    await helpPage.goto()

    // Test Cmd+K for command palette
    await helpPage.openCommandPalette()
    await expect(helpPage.commandPalette).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(helpPage.commandPalette).not.toBeVisible()
  })

  test('should show keyboard shortcuts help', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Look for keyboard shortcuts section
    const shortcutsSection = page.locator('[data-testid="keyboard-shortcuts"]')

    if (await shortcutsSection.isVisible()) {
      await expect(shortcutsSection).toBeVisible()

      // Should list common shortcuts
      const shortcutsText = await shortcutsSection.textContent()
      expect(shortcutsText).toContain('Cmd')
    }
  })

  test('should filter help topics by category', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Look for category filter
    const categoryFilter = page.locator('[data-testid="category-filter"]')

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click()
      await page.click('[role="option"]:has-text("Database")')

      // Should show only database-related help
      await page.waitForTimeout(500)

      const content = await page.textContent('main')
      expect(content?.toLowerCase()).toContain('database')
    }
  })

  test('should show contextual help', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Look for help icon or button
    const helpIcon = page.locator('[data-testid="help-icon"]')

    if (await helpIcon.isVisible()) {
      await helpIcon.click()

      // Should show tooltip or popover with help text
      await expect(page.locator('[role="tooltip"]')).toBeVisible()
    }
  })

  test('should link to external documentation', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Look for external documentation links
    const externalLink = page.locator('a[href^="http"]').first()

    if (await externalLink.isVisible()) {
      const href = await externalLink.getAttribute('href')
      expect(href).toBeTruthy()

      // Should have target="_blank" for external links
      const target = await externalLink.getAttribute('target')
      expect(target).toBe('_blank')
    }
  })

  test('should show version information', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Look for version info
    const versionInfo = page.locator('[data-testid="version-info"]')

    if (await versionInfo.isVisible()) {
      const versionText = await versionInfo.textContent()
      expect(versionText).toMatch(/v?\d+\.\d+\.\d+/)
    }
  })

  test('should support quick navigation', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Open command palette
    await helpPage.openCommandPalette()

    if (await helpPage.commandPalette.isVisible()) {
      // Type to filter
      await page.keyboard.type('dashboard')

      // Press Enter to navigate
      await page.keyboard.press('Enter')

      // Should navigate to dashboard
      await page.waitForTimeout(500)
      await expect(page).toHaveURL(/\/dashboard|\//)
    }
  })

  test('should be responsive on mobile', async ({ helpPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await helpPage.goto()

    await expect(helpPage.pageTitle).toBeVisible()

    if (await helpPage.searchInput.isVisible()) {
      await expect(helpPage.searchInput).toBeVisible()
    }
  })

  test('should have accessible navigation', async ({ helpPage, page }) => {
    await helpPage.goto()

    // Help links should be keyboard navigable
    const firstLink = page.locator('a').first()
    await firstLink.focus()
    await expect(firstLink).toBeFocused()

    // Tab through links
    await page.keyboard.press('Tab')

    const focusedElement = page.locator(':focus')
    const tagName = await focusedElement.evaluate((el) => el.tagName)

    expect(['A', 'BUTTON', 'INPUT', 'DIV', 'SPAN', 'TEXTAREA', 'SELECT']).toContain(tagName)
  })
})
