import { type Page } from '@playwright/test'

export const TEST_PASSWORD = 'Test123!@#'

/**
 * Setup authentication for tests
 */
export async function setupAuth(page: Page, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait for redirect after login. Use a regex that requires the word
  // (dashboard|build|start) — NOT optional — so this never resolves on
  // /login itself (which would match the old /\/(dashboard|build|start)?/
  // regex due to the optional group matching zero characters).
  await page.waitForURL(/\/(dashboard|build|start)/, { timeout: 20000 })
}

/**
 * Clear all application state
 *
 * Note: page.evaluate() requires the page to have a navigated origin before
 * it can access localStorage/sessionStorage. Firefox enforces this strictly
 * (throws "The operation is insecure" on about:blank). Navigate to the app
 * root first so there is a valid origin, then clear storage.
 */
export async function clearAppState(page: Page) {
  // Clear cookies via context (works without a navigated page)
  await page.context().clearCookies()
  // Navigate to the app root so we have a valid origin for storage access.
  // This prevents Firefox from throwing "The operation is insecure" when
  // page.evaluate() is called on an unnavigated (about:blank) page.
  const currentUrl = page.url()
  if (currentUrl === 'about:blank' || currentUrl === '') {
    await page.goto('/')
  }
  // Clear local storage
  await page.evaluate(() => localStorage.clear())
  // Clear session storage
  await page.evaluate(() => sessionStorage.clear())
}

/**
 * Wait for element to be stable (not moving)
 */
export async function waitForStable(page: Page, selector: string) {
  const element = page.locator(selector)
  await element.waitFor({ state: 'visible' })
  // Wait for animations to complete
  await page.waitForTimeout(300)
}

/**
 * Check if element is visible in viewport
 */
export async function isInViewport(page: Page, selector: string) {
  const element = page.locator(selector)
  const box = await element.boundingBox()
  if (!box) return false

  const viewport = page.viewportSize()
  if (!viewport) return false

  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  )
}

/**
 * Test accessibility with keyboard navigation
 */
export async function testKeyboardNavigation(
  page: Page,
  startSelector: string,
  endSelector: string,
) {
  await page.locator(startSelector).focus()
  let currentElement = await page.locator(':focus')
  let iterations = 0
  const maxIterations = 50

  while (iterations < maxIterations) {
    await page.keyboard.press('Tab')
    iterations++

    currentElement = await page.locator(':focus')
    const matches = await currentElement.evaluate(
      (el, selector) => el.matches(selector),
      endSelector,
    )

    if (matches) {
      return true
    }
  }

  return false
}

/**
 * Test responsive design at different viewports
 */
export async function testResponsive(
  page: Page,
  callback: () => Promise<void>,
) {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    })
    await callback()
  }
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
) {
  return page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200,
  )
}

/**
 * Mock API endpoint
 */
export async function mockApiEndpoint(
  page: Page,
  url: string,
  response: unknown,
) {
  await page.route(url, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    }),
  )
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({
    path: `tests/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  })
}

/**
 * Check ARIA labels and accessibility
 */
export async function checkAccessibility(page: Page, selector: string) {
  const element = page.locator(selector)
  const ariaLabel = await element.getAttribute('aria-label')
  const ariaDescribedBy = await element.getAttribute('aria-describedby')
  const role = await element.getAttribute('role')

  return {
    hasAriaLabel: !!ariaLabel,
    hasAriaDescribedBy: !!ariaDescribedBy,
    hasRole: !!role,
    ariaLabel,
    ariaDescribedBy,
    role,
  }
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingComplete(page: Page) {
  const spinner = page.locator('[data-testid="loading-spinner"]')
  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden', timeout: 30000 })
  }
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(page: Page) {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (500 * 1024) / 8, // 500kb/s
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
  })
}
