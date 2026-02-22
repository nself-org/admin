/**
 * Playwright globalSetup — runs once before all test workers start.
 *
 * Purpose: pre-warm every Next.js route AND client-side JS bundle that the
 * auth flow touches so that the JIT compilation cost is paid here, not inside
 * individual tests.
 *
 * WHY A REAL BROWSER (not just APIRequestContext):
 *   Next.js dev mode has two compilation layers:
 *   1. Server-side: React SSR handler compiled on first HTTP request
 *   2. Client-side: JS module chunks compiled when the browser fetches them
 *      via /_next/static/chunks/…
 *
 *   An HTTP-only warm-up (APIRequestContext) only covers layer 1.  The client
 *   JS bundles for the login page are still uncompiled when the first test
 *   browser opens.  React hydration therefore takes 10–20 s, so Playwright
 *   clicks the submit button BEFORE React attaches its event handler.  The
 *   browser then executes the native form submit (page reload to /login)
 *   instead of the AJAX login flow — and the test never navigates away.
 *
 *   A real browser (even headless) fetches all /_next/… JS chunks, causing
 *   Next.js to compile them.  Once compiled they are cached in memory by the
 *   dev server and served instantly to all subsequent browser contexts.
 *
 * WHY WE PARAMETERISE THE BROWSER TYPE:
 *   Each CI matrix job (chromium / firefox / webkit) installs only its own
 *   browser binary.  Using chromium.launch() in globalSetup would break the
 *   firefox and webkit jobs.  We read WARMUP_BROWSER (set in the CI workflow)
 *   to launch the same binary that is actually installed.
 *   Falls back to chromium for local/mobile runs.
 *
 * This setup also sets the admin password exactly once so that every test
 * worker finds the server in login mode from the start.
 *
 * Routes and bundles warmed:
 *   /login                          — page SSR + client JS bundles
 *   GET  /api/auth/init             — setup/login mode check
 *   POST /api/auth/init             — password setup (if needed)
 *   GET  /api/auth/csrf             — CSRF token route
 *   POST /api/auth/login            — credential verification
 *   GET  /api/project/status        — post-login routing logic
 *        middleware                 — session validation on every protected route
 *   POST /api/auth/validate-session — middleware's internal endpoint
 *   /build                          — destination page SSR + client JS bundles
 */

import {
  chromium,
  firefox,
  webkit,
  type BrowserType,
  type FullConfig,
} from '@playwright/test'

import { TEST_PASSWORD } from './helpers'

const BROWSER_TYPES: Record<string, BrowserType> = { chromium, firefox, webkit }

export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const base = baseURL ?? 'http://localhost:3021'

  // Each CI job installs only its own browser.  WARMUP_BROWSER is set by the
  // e2e-tests.yml workflow to match the matrix entry for that job.
  // Falls back to chromium for local runs and the mobile job.
  const browserName = (process.env.WARMUP_BROWSER ?? 'chromium').toLowerCase()
  const browserType = BROWSER_TYPES[browserName] ?? chromium

  console.log(`[globalSetup] Using ${browserName} to warm up routes…`)
  const browser = await browserType.launch()
  const context = await browser.newContext({ baseURL: base })
  const page = await context.newPage()

  try {
    // Step 1: Full browser navigation to /login.
    // • Triggers SSR compilation of the login page component.
    // • Causes the browser to fetch /_next/static/chunks/… → Next.js compiles
    //   all client-side JS modules for the login page on the server.
    // • waitUntil: 'networkidle' ensures every /_next/… request has returned
    //   (i.e. all bundles are compiled and served) before we continue.
    console.log(
      '[globalSetup] Navigating to /login (warming SSR + JS bundles)…',
    )
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 })

    // Step 2: Check password status (warms /api/auth/init GET).
    const initRes = await page.request.get('/api/auth/init')
    const { passwordExists } = (await initRes.json()) as {
      passwordExists: boolean
    }

    // Step 3: Set password if not already set (server-side LokiJS persists).
    if (!passwordExists) {
      console.log('[globalSetup] Setting admin password…')
      const r = await page.request.post('/api/auth/init', {
        data: { password: TEST_PASSWORD },
      })
      if (!r.ok()) {
        throw new Error(
          `[globalSetup] Failed to set admin password: ${await r.text()}`,
        )
      }
      // Reload so the component reflects the new password state (login mode).
      // Also warms any bundles that differ between setup-mode and login-mode.
      console.log('[globalSetup] Reloading page to enter login mode…')
      await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
    }

    // Step 4: Wait for React hydration.
    // Once networkidle resolves all JS chunks are compiled, but React still
    // needs a moment to attach event handlers (hydrate).  Waiting for the
    // password input to be in a stable, visible state ensures handleSubmit
    // will intercept the click rather than the native form submit.
    await page.waitForSelector('input[type="password"]', {
      state: 'visible',
      timeout: 15000,
    })

    // Step 5: Submit the login form via the React handler.
    // This warms the remaining server-side routes in a single authenticated pass:
    //   GET  /api/auth/csrf             (called by handleSubmit before POST)
    //   POST /api/auth/login            (credential check + session cookie)
    //   GET  /api/project/status        (called by getCorrectRoute after login)
    //        middleware                 (fires on first protected-route navigation)
    //   POST /api/auth/validate-session (middleware's internal fetch)
    //   /build page SSR + JS bundles    (destination after login)
    console.log('[globalSetup] Submitting login form to warm remaining routes…')
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // 60 s budget for the full cold-start chain.  After this, all routes and
    // JS bundles are cached; subsequent auth in tests completes in < 5 s.
    await page.waitForURL(/\/(dashboard|build|start)/, { timeout: 60000 })

    // Drain the /build page's mount-time API calls so they complete BEFORE
    // any test worker fires its own requests.  Specifically, build/page.tsx
    // calls runPreBuildChecks() → GET /api/project/status on mount.  Waiting
    // for networkidle here ensures that request resolves and populates the
    // server-side status cache — giving every test a sub-millisecond cache
    // hit instead of a 10–15 s cold shell-command execution.
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    console.log(
      '[globalSetup] All routes and JS bundles pre-compiled. Tests will run with a warm server.',
    )
  } finally {
    await context.close()
    await browser.close()
  }
}
