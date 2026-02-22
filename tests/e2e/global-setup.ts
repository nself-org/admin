/**
 * Playwright globalSetup — runs once before all test workers start.
 *
 * Purpose: pre-warm every Next.js route that the auth flow touches so that
 * the JIT compilation cost is paid here, not inside individual tests.
 *
 * Without this, a cold Next.js dev server compiles each route on its first
 * request (3–10 s per route).  The full auth chain touches 6+ routes, making
 * the total cold-start 35–50 s — which blows past the waitForURL timeout
 * used in setupAuth().
 *
 * This setup also sets the admin password exactly once so that every test
 * worker finds the server in login mode from the start.
 *
 * Routes warmed:
 *   GET  /login                    — login page component
 *   GET  /api/auth/init            — setup/login mode check
 *   GET  /api/auth/csrf            — CSRF token generation
 *   POST /api/auth/login           — credential verification
 *   GET  /api/project/status       — post-login routing logic
 *        middleware                — session validation on every protected route
 *   GET  /api/auth/validate-session — called internally by middleware
 *   GET  /build                    — destination page (most tests land here)
 */

import { chromium, type FullConfig } from '@playwright/test'

import { TEST_PASSWORD } from './helpers'

export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const serverURL = baseURL ?? 'http://localhost:3021'

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: serverURL })
  const page = await context.newPage()

  try {
    // Step 1: Navigate to /login.
    // • Compiles the login page component.
    // • Triggers GET /api/auth/init from the component's useEffect, which
    //   compiles that route handler.
    // • waitUntil: 'networkidle' ensures the useEffect fetch has completed and
    //   the form is in its final state before we read it.
    console.log('[globalSetup] Navigating to /login…')
    await page.goto('/login', { waitUntil: 'networkidle' })

    // Step 2: Ensure the admin password is set.
    // Server-side LokiJS state persists for the entire server process, so all
    // test workers will see the same passwordExists state we establish here.
    const initRes = await page.request.get('/api/auth/init')
    const { passwordExists } = (await initRes.json()) as {
      passwordExists: boolean
    }

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
      console.log('[globalSetup] Reloading to switch to login mode…')
      await page.reload({ waitUntil: 'networkidle' })
    }

    // Step 3: Wait for the password input to be ready, then submit the form.
    // This warms the remaining routes in a single pass:
    //   GET  /api/auth/csrf          (called by handleSubmit before POST)
    //   POST /api/auth/login         (credential check + session cookie)
    //   GET  /api/project/status     (called by getCorrectRoute after login)
    //        middleware              (fires on every navigation to protected route)
    //   GET  /api/auth/validate-session (internal fetch inside middleware)
    //   GET  /build                  (destination page — compiled on navigation)
    console.log('[globalSetup] Submitting login form to warm auth chain…')
    await page.waitForSelector('input[type="password"]', {
      state: 'visible',
      timeout: 10000,
    })
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // 60 s budget for the full cold-start chain (all routes compiled from
    // scratch).  After this, test workers hit pre-compiled routes and the
    // same auth flow takes < 5 s.
    await page.waitForURL(/\/(dashboard|build|start)/, { timeout: 60000 })

    console.log(
      '[globalSetup] All routes pre-compiled. Tests will run with a warm server.',
    )
  } finally {
    await context.close()
    await browser.close()
  }
}
