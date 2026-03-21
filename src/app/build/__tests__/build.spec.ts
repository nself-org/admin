/**
 * E2E Tests for Build Page
 * Tests the complete build flow from pre-checks to completion
 */

import { expect, test } from '@playwright/test'

test.describe('Build Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to build page
    await page.goto('/build')
  })

  test('should display pre-build checks', async ({ page }) => {
    // Wait for checks to complete
    await page.waitForSelector('text=Pre-Build Checks', { timeout: 10000 })

    // Verify all checks are visible
    await expect(page.getByText('Environment files')).toBeVisible()
    await expect(page.getByText('Docker daemon')).toBeVisible()
    await expect(page.getByText('nself CLI')).toBeVisible()
  })

  test('should show build progress when starting build', async ({ page }) => {
    // Wait for pre-build checks
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })

    // Click start build
    await page.click('button:has-text("Start Build")')

    // Verify build progress is shown
    await expect(page.getByText('Build Progress')).toBeVisible()
    await expect(page.getByText('Validating configuration')).toBeVisible()
  })

  test('should display real-time logs during build', async ({ page }) => {
    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for logs section
    await expect(page.getByText('Build Logs')).toBeVisible({ timeout: 5000 })

    // Verify log entries appear
    const logViewer = page.locator('[class*="bg-zinc-950"]')
    await expect(logViewer).toBeVisible()
  })

  test('should filter logs by error/warning', async ({ page }) => {
    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for logs
    await page.waitForSelector('text=Build Logs', { timeout: 5000 })

    // Click errors only filter
    await page.click('label:has-text("Errors Only")')

    // Verify checkbox is checked
    const checkbox = page.locator('input[id="filter-errors"]')
    await expect(checkbox).toBeChecked()
  })

  test('should download logs when download button is clicked', async ({
    page,
  }) => {
    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for logs
    await page.waitForSelector('text=Build Logs', { timeout: 5000 })

    // Setup download listener
    const downloadPromise = page.waitForEvent('download')

    // Click download button
    await page.click('button[title="Download logs"]')

    // Verify download started
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/build-logs-.*\.txt/)
  })

  test('should pause and resume auto-scroll', async ({ page }) => {
    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for logs
    await page.waitForSelector('text=Build Logs', { timeout: 5000 })

    // Click pause button
    await page.click('button[title*="auto-scroll"]')

    // Verify pause icon changes to play (button should show "Resume")
    const playButton = page.locator('button[title*="Resume"]')
    await expect(playButton).toBeVisible()
  })

  test('should search logs', async ({ page }) => {
    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for logs
    await page.waitForSelector('text=Build Logs', { timeout: 5000 })

    // Click search icon
    const searchButtons = page.locator('button').filter({ hasText: '' })
    await searchButtons.first().click()

    // Type in search box
    const searchInput = page.locator('input[placeholder="Search logs..."]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('docker')

    // Verify search is working
    expect(await searchInput.inputValue()).toBe('docker')
  })

  test('should show success state and redirect', async ({ page }) => {
    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for success (this may take a while in real environment)
    await expect(page.getByText('Build Successful')).toBeVisible({
      timeout: 30000,
    })

    // Should show success alert
    await expect(page.getByText('Build Complete!')).toBeVisible()
  })

  test('should handle build errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/nself/build', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Build failed' }),
      })
    })

    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Should show error state
    await expect(page.getByText('Build Failed')).toBeVisible({
      timeout: 10000,
    })

    // Should show retry button
    await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible()
  })

  test('should retry build after failure', async ({ page }) => {
    // Mock API to fail first, then succeed
    let callCount = 0
    await page.route('**/api/nself/build', (route) => {
      callCount++
      if (callCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Build failed' }),
        })
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, serviceCount: 8 }),
        })
      }
    })

    // Start build
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })
    await page.click('button:has-text("Start Build")')

    // Wait for error
    await expect(page.getByText('Build Failed')).toBeVisible({
      timeout: 10000,
    })

    // Click retry
    await page.click('button:has-text("Retry Build")')

    // Should start building again
    await expect(page.getByText('Building Project')).toBeVisible()
  })

  test('should navigate back to setup wizard on reset', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('button:has-text("Start Build")', {
      timeout: 10000,
    })

    // Click back to setup button
    await page.click('button:has-text("Back to Setup")')

    // Should navigate to init wizard
    await page.waitForURL('**/init/**', { timeout: 5000 })
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Navigate to build page
    await page.goto('/build')

    // Should show mobile-optimized layout
    await page.waitForSelector('text=Pre-Build Checks', { timeout: 10000 })

    // Verify content is visible and not cut off
    const header = page.getByRole('heading', { level: 1 })
    await expect(header).toBeVisible()
  })
})
