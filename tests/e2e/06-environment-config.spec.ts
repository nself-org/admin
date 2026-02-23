import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

test.describe('Environment Configuration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should navigate to config page', async ({ configPage }) => {
    await configPage.gotoEnv()
    await expect(configPage.pageTitle).toBeVisible()
    await expect(configPage.page).toHaveURL(/\/config/)
  })

  test.skip('should switch environment tabs', async ({ configPage, page }) => {
    // Skipped: requires a running nself backend with a configured project.
    // Without a backend the app stays at /build or /init; the /config/env route
    // never renders envTabs and the hard expect times out in CI.
    await configPage.gotoEnv()

    // Should have environment tabs
    await expect(configPage.envTabs).toBeVisible()

    // Switch to Dev tab
    await configPage.switchEnvironment('Dev')
    await expect(page.locator('[role="tabpanel"]')).toBeVisible()

    // Switch to Local tab
    await configPage.switchEnvironment('Local')
    await expect(page.locator('[role="tabpanel"]')).toBeVisible()
  })

  test('should add new environment variable', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    // Add new variable
    const testKey = 'TEST_VAR'
    const testValue = 'test_value'

    if (await configPage.addVariableButton.isVisible()) {
      await configPage.addVariable(testKey, testValue)

      // Variable should appear in list
      await configPage.expectVariableExists(testKey)
    }
  })

  test('should edit existing variable', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    // Find first variable
    const variableRow = page.locator('[data-testid="variable-row"]').first()

    if (await variableRow.isVisible()) {
      const variableKey = await variableRow.getAttribute('data-key')

      if (variableKey) {
        const newValue = 'updated_value'
        await configPage.editVariable(variableKey, newValue)

        // Should show success message
        await expect(page.locator('[role="alert"]')).toContainText(
          /saved|updated/i,
        )
      }
    }
  })

  test('should delete variable', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    // Find a variable to delete
    const variableRow = page.locator('[data-testid="variable-row"]').first()

    if (await variableRow.isVisible()) {
      const variableKey = await variableRow.getAttribute('data-key')

      if (variableKey) {
        await configPage.deleteVariable(variableKey)

        // Variable should be removed
        await configPage.expectVariableNotExists(variableKey)
      }
    }
  })

  test('should save changes', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    if (await configPage.saveButton.isVisible()) {
      await configPage.saveChanges()

      // Should show success message
      await expect(page.locator('[role="alert"]')).toContainText(/saved/i)
    }
  })

  test('should validate variable names', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    if (await configPage.addVariableButton.isVisible()) {
      // Try to add variable with invalid name
      await configPage.addVariableButton.click()
      await page.fill('[data-testid="variable-key"]', 'invalid-name')
      await page.fill('[data-testid="variable-value"]', 'value')
      await page.click('button:has-text("Add")')

      // Should show validation error
      await expect(page.locator('[role="alert"]')).toBeVisible()
    }
  })

  test.skip('should show environment-specific variables', async ({
    configPage,
    page,
  }) => {
    // Skipped: requires a running nself backend with a configured project.
    // switchEnvironment() targets a [role="tab"] that only renders once the
    // /config/env page is fully loaded with a live backend.
    await configPage.gotoEnv()

    // Switch to Dev environment
    await configPage.switchEnvironment('Dev')

    // Should show dev-specific variables
    const variablesList = page.locator('[data-testid="variables-list"]')
    if (await variablesList.isVisible()) {
      await expect(variablesList).toBeVisible()
    }
  })

  test('should filter variables', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    // Look for search/filter input
    const filterInput = page.locator('input[placeholder*="Filter"]')

    if (await filterInput.isVisible()) {
      await filterInput.fill('DATABASE')

      // Should filter variables
      await page.waitForTimeout(500)

      const variableRows = page.locator('[data-testid="variable-row"]')
      const count = await variableRows.count()

      // All visible variables should match filter
      for (let i = 0; i < count; i++) {
        const row = variableRows.nth(i)
        const text = await row.textContent()
        expect(text?.toUpperCase()).toContain('DATABASE')
      }
    }
  })

  test('should support secret masking', async ({ configPage, page }) => {
    await configPage.gotoEnv()

    // Look for secret/password variables
    const secretVariables = page.locator(
      '[data-testid="variable-row"][data-secret="true"]',
    )

    if ((await secretVariables.count()) > 0) {
      const firstSecret = secretVariables.first()
      const value = firstSecret.locator('[data-testid="variable-value"]')

      // Value should be masked
      const valueText = await value.textContent()
      expect(valueText).toMatch(/\*+/)
    }
  })

  test.skip('should be responsive on mobile', async ({ configPage, page }) => {
    // Skipped: requires a running nself backend with a configured project.
    // envTabs only renders on /config/env once the backend is available;
    // the hard expect on configPage.envTabs times out in CI.
    await page.setViewportSize({ width: 375, height: 667 })
    await configPage.gotoEnv()

    await expect(configPage.pageTitle).toBeVisible()
    await expect(configPage.envTabs).toBeVisible()
  })

  test.skip('should have accessible tab navigation', async ({
    configPage,
    page,
  }) => {
    // Skipped: requires a running nself backend with a configured project.
    // The [role="tablist"] element is only present on /config/env when the
    // backend is available; toHaveAttribute times out in CI.
    await configPage.gotoEnv()

    // Tab list should have proper ARIA attributes
    const tabList = page.locator('[role="tablist"]')
    await expect(tabList).toHaveAttribute('aria-label')

    // Tabs should be keyboard navigable
    const firstTab = page.locator('[role="tab"]').first()
    await firstTab.focus()
    await expect(firstTab).toBeFocused()

    // Arrow keys should navigate tabs
    await page.keyboard.press('ArrowRight')

    const focusedElement = page.locator(':focus')
    const role = await focusedElement.getAttribute('role')
    expect(role).toBe('tab')
  })
})
