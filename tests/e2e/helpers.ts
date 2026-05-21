import { promises as fs } from 'node:fs'
import path from 'node:path'

import { type Cookie, type Page } from '@playwright/test'

// Must satisfy production password policy: ≥12 chars, upper, lower, digit, special
export const TEST_PASSWORD = 'Test123!@#Xy'

// Path to the authenticated storage state produced once by globalSetup.  Kept
// in sync with STORAGE_STATE_PATH in global-setup.ts.  setupAuth() reads the
// session cookie back from this file as a WebKit fallback (see below).
const STORAGE_STATE_PATH = path.resolve('playwright/.auth/admin.json')

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
 * Setup authentication for tests.
 *
 * Strategy: **storageState pre-authentication** (canonical Playwright
 * https://playwright.dev/docs/auth pattern).  globalSetup performs the API
 * login exactly once and saves the resulting cookie + localStorage to
 * `playwright/.auth/admin.json`.  Every browser project in
 * playwright.config.ts loads that file via `use.storageState`, so every test
 * context starts already authenticated — no per-test login required.
 *
 * Why this exists as a function still:
 *   • The mock for /api/project/status is registered at the fixtures level
 *     (only in CI) but tests that import `setupAuth` may run against a real
 *     backend locally where the fixture mock is skipped.  Calling
 *     `mockProjectStatus` here is harmless in CI (route handlers are
 *     accumulated, last-registered wins) and guarantees the mock is present
 *     when needed.
 *   • Keeping the function preserves the import surface for all 13 spec files
 *     that import `setupAuth` from `./helpers`, avoiding a sweeping
 *     non-functional refactor.
 *   • The `password` parameter is retained for backward compatibility but is
 *     no longer used — the session cookie in storageState was minted with
 *     `TEST_PASSWORD` already.
 *
 * Why this fixes the WebKit cookie race definitively:
 *   The previous per-test API login (page.request.post) raced against the
 *   browser's cookie-jar commit on WebKit.  storageState writes the cookie
 *   into the context BEFORE the first navigation begins, so middleware on
 *   the first page.goto() always sees `nself-session` and never bounces the
 *   test to /login mid-navigation.  The race window does not exist.
 */
export async function setupAuth(page: Page, _password = TEST_PASSWORD): Promise<void> {
  // Ensure the project-status + auth-check + CLI mock surface is registered
  // for this page.  Idempotent enough: the fixture installs the mocks once at
  // the start of every CI test, so this call is a no-op cost in CI; in local
  // runs without the CI fixture it provides the same mocks setupAuth used to
  // install.
  await mockProjectStatus(page)

  // WebKit fallback: guarantee the session cookie is in this context before the
  // first navigation.
  //
  // The storageState file produced by globalSetup is loaded by every browser
  // project via `use.storageState`.  Chromium and Firefox replay the
  // httpOnly `nself-session` cookie from that file faithfully.  WebKit,
  // however, intermittently drops httpOnly cookies when replaying storageState
  // over plain http://localhost — the cookie is in the file but absent from the
  // live context's cookie jar.  When that happens the cookie-aware
  // /api/auth/check mock returns 401 and the app bounces the test to /login,
  // failing every storageState-dependent test in the WebKit shards.
  //
  // Re-injecting the saved cookie into the context closes that gap
  // deterministically.  It is a no-op on Chromium/Firefox (the cookie is
  // already present) and self-heals WebKit without weakening any assertion or
  // changing the production cookie code.
  await ensureSessionCookie(page)
  // No login flow needed beyond the cookie guarantee above — the
  // `nself_project_setup_confirmed` localStorage flag also rides in the saved
  // storageState, so tests may proceed directly to their target route.
}

/**
 * Purpose:    Guarantee the `nself-session` cookie is present in the page's
 *             browser context, re-injecting it from the saved storageState file
 *             if the engine (WebKit) dropped it during storageState replay.
 * Inputs:     `page` — the Playwright Page whose context is checked/repaired.
 * Outputs:    Resolves once the cookie is present, or after a best-effort
 *             re-injection attempt.  Never throws on a missing state file —
 *             local runs against a real backend may not have one.
 * Constraints: Cookies are origin-scoped; only the `nself-session` (and CSRF)
 *             cookies for the test baseURL are injected.  httpOnly/sameSite
 *             attributes are preserved from the saved state so the re-injected
 *             cookie behaves identically to the globalSetup-minted one.
 */
async function ensureSessionCookie(page: Page): Promise<void> {
  const context = page.context()
  const existing = await context.cookies()
  if (existing.some((c) => c.name === 'nself-session')) {
    return // Fast path: Chromium/Firefox already have the cookie.
  }

  const saved = await readStorageStateCookies()
  const sessionCookies = saved.filter(
    (c) => c.name === 'nself-session' || c.name === 'nself-csrf'
  )
  if (sessionCookies.length === 0) {
    // No saved state (e.g. local run without globalSetup, or a spec that
    // intentionally starts unauthenticated).  Nothing to repair.
    return
  }
  await context.addCookies(sessionCookies)
}

/**
 * Purpose:    Read the cookie array out of the storageState JSON written by
 *             globalSetup.
 * Inputs:     none (reads STORAGE_STATE_PATH).
 * Outputs:    The parsed cookies, or an empty array if the file is missing or
 *             malformed.
 * Constraints: Pure read; tolerant of absence so callers can no-op gracefully.
 */
async function readStorageStateCookies(): Promise<Cookie[]> {
  try {
    const raw = await fs.readFile(STORAGE_STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as { cookies?: Cookie[] }
    return parsed.cookies ?? []
  } catch {
    return []
  }
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
