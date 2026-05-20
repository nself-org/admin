import { type Page } from '@playwright/test'

// Must satisfy production password policy: ≥12 chars, upper, lower, digit, special
export const TEST_PASSWORD = 'Test123!@#Xy'

/**
 * Mock /api/project/status and all CLI-dependent API endpoints that pages
 * call on mount.
 *
 * In CI there is no nself project, so the real endpoint returns needsSetup: true
 * and ProjectStateWrapper redirects every page to /init/1.  This mock lets tests
 * navigate to /build, /config, /dashboard, etc. without being hijacked.
 *
 * The additional mocks below prevent 22-30 s hangs that occur when pages call
 * CLI-dependent endpoints (docker, nself binary) on mount and the binary is
 * absent in CI.  Without these mocks, every first test in a spec would exhaust
 * its 30 s timeout waiting for the unmocked fetch to fail.
 *
 * Call this BEFORE any navigation that triggers ProjectStateWrapper (which is
 * every authenticated page load).
 */
export async function mockProjectStatus(page: Page) {
  // Mock /api/auth/check so AuthProvider resolves immediately with an
  // authenticated session.  Without this mock the AuthProvider spinner
  // blocks ALL page content (no h1, no children) for up to 20 s in CI
  // because each test worker starts with a fresh browser context that
  // has no session cookie, causing /api/auth/check to return 401.
  //
  // The mock is cookie-aware: it returns 200 only when a nself-session
  // cookie is present in the request (matching the real server behaviour).
  // Tests that clear cookies to test unauthenticated states therefore
  // still receive a 401, so redirect-to-login assertions continue to work.
  await page.route('**/api/auth/check', (route) => {
    const cookie = route.request().headers()['cookie'] ?? ''
    if (cookie.includes('nself-session')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          userId: 'test-admin',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'No session' }),
    })
  })

  await page.route('**/api/project/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        projectState: 'configured',
        needsSetup: false,
        hasEnvFile: true,
        hasDockerCompose: true,
        isBuilt: true,
        hasAdminPassword: true,
        servicesRunning: true,
        runningServices: ['postgres', 'hasura', 'auth', 'nginx'],
        dockerContainers: ['postgres', 'hasura', 'auth', 'nginx'],
        containerCount: 4,
        config: { projectName: 'test', baseDomain: 'localhost' },
        projectPath: '/tmp/test',
        summary: {
          initialized: true,
          configured: true,
          built: true,
          running: true,
        },
      }),
    })
  )

  // Mock the two remaining SimplifiedPolling endpoints so they return
  // immediately in CI instead of timing out after 1.5 s on every 2-second
  // tick.  Without these mocks, networkidle never resolves because the
  // AbortSignal.timeout(1500) errors count as pending network activity.
  await page.route('**/api/system/metrics', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          cpu: { value: 10, unit: '%' },
          memory: { value: 40, unit: '%' },
          disk: { value: 30, unit: '%' },
        },
      }),
    })
  )

  await page.route('**/api/docker/containers**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { containers: [] },
      }),
    })
  )

  // /build page: runPreBuildChecks() fetches these on mount via useEffect.
  // Both call the nself binary or Docker daemon which are absent in CI —
  // without mocks every /build navigation hangs for ~5 s until exec timeout.
  await page.route('**/api/docker/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        running: true,
        message: 'Docker daemon is running',
      }),
    })
  )

  await page.route('**/api/nself/version', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 'v1.1.1',
        path: '/usr/local/bin/nself',
      }),
    })
  )

  // /logs page: fetches /api/project/services-detail on mount to populate the
  // service selector.  The real route reads docker-compose.yml which does not
  // exist in CI, returning an empty services map.
  await page.route('**/api/project/services-detail', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        services: {
          postgres: { name: 'postgres', image: 'postgres:15' },
          hasura: { name: 'hasura', image: 'hasura/graphql-engine:latest' },
          auth: { name: 'auth', image: 'nhost/hasura-auth:latest' },
          nginx: { name: 'nginx', image: 'nginx:latest' },
        },
        projectPath: '/tmp/test',
      }),
    })
  )

  // /config page: fetches /api/config/env on mount to populate the env var
  // editor.  The real route reads .env.local which does not exist in CI.
  await page.route('**/api/config/env**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          environment: 'local',
          variables: [],
          availableEnvironments: ['local', 'dev', 'stage', 'prod', 'secrets'],
          hasChanges: false,
        },
      }),
    })
  )

  // /deployment/staging page: fetches /api/deploy/staging on mount.
  // /deployment/prod page: fetches /api/deploy/production on mount.
  // Both call the nself binary (nself prod/staging status) which is absent in CI.
  await page.route('**/api/deploy/staging', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'not-configured',
        output: '',
        stderr: '',
      }),
    })
  )

  await page.route('**/api/deploy/production', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'not-configured',
        output: '',
        stderr: '',
      }),
    })
  )

  // /config/cors, /config/email, /config/rate-limits, /config/docker pages:
  // These call their respective APIs on mount to populate form fields.  The
  // real routes read .env files absent in CI, so they return errors slowly.
  // Without mocks, waitForLoadState('networkidle') in 12-config-pages.spec.ts
  // hangs for the full test timeout.
  await page.route('**/api/config/cors**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        cors: {
          allowedOrigins: '',
          hasuraCorsDomain: '*',
          authClientUrl: 'http://localhost:3000',
        },
      }),
    })
  )

  await page.route('**/api/config/email**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        smtp: {
          host: 'mailpit',
          port: '1025',
          secure: 'false',
          user: '',
          pass: '',
          sender: 'noreply@nself.local',
          hasPass: false,
        },
      }),
    })
  )

  await page.route('**/api/config/rate-limits**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        rateLimits: {
          apiEnabled: 'true',
          apiRequests: '100',
          apiWindow: '60',
          globalEnabled: 'true',
          globalMaxRequests: '100',
          globalWindowSeconds: '60',
          globalBurst: '20',
        },
      }),
    })
  )

  await page.route('**/api/config/docker**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        docker: {
          services: {
            postgres: { version: '15', port: '5432' },
            hasura: { version: 'latest' },
            auth: { version: 'latest', port: '4000' },
            storage: { version: 'latest' },
            nginx: { version: 'alpine', port: '80', sslPort: '443' },
            redis: { version: '7-alpine', port: '6379' },
            mailpit: { version: 'latest', uiPort: '8025', smtpPort: '1025' },
          },
          raw: {
            POSTGRES_VERSION: '15',
            POSTGRES_PORT: '5432',
          },
        },
      }),
    })
  )
}

/**
 * Setup authentication for tests
 */
export async function setupAuth(page: Page, password = TEST_PASSWORD) {
  // Mock project status so ProjectStateWrapper doesn't redirect to /init/1.
  await mockProjectStatus(page)

  // waitUntil: 'domcontentloaded' is enough here because globalSetup has
  // already pre-warmed all Next.js JS bundles and compiled all routes.
  // Using 'networkidle' risks a 30s hang when SSE / polling connections
  // on adjacent pages keep the network busy.  The waitForSelector call
  // below already waits for React to hydrate (input becomes enabled).
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  // Wait for the password input to become enabled (after /api/auth/init
  // completes and React sets isCheckingSetup → false).
  await page.waitForSelector('input[type="password"]:not([disabled])', {
    state: 'visible',
    timeout: 15000,
  })
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait until we've left /login.  With the mock, the app may route to
  // /build, /, /start, or /dashboard depending on race order between
  // Layout's useEffect and the login page's getCorrectRoute call.
  //
  // Use waitUntil: 'commit' so the wait resolves as soon as the URL changes
  // (Next.js client-side navigation).  The default 'load' level waits for
  // all resources including SSE/polling connections that never complete in
  // CI, causing 30s timeouts on every shard past the first.
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30000,
    waitUntil: 'commit',
  })
  // Let the redirect settle before the test body starts navigating.
  // domcontentloaded is sufficient — SSE streams keep 'load'/'networkidle'
  // busy indefinitely on dashboard pages.
  await page.waitForLoadState('domcontentloaded').catch(() => {
    // ignore — rare race where navigation aborts before DOMContentLoaded
  })
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
  endSelector: string
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
      endSelector
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
export async function testResponsive(page: Page, callback: () => Promise<void>) {
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
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200
  )
}

/**
 * Mock API endpoint
 */
export async function mockApiEndpoint(page: Page, url: string, response: unknown) {
  await page.route(url, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
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
