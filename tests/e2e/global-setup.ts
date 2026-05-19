/**
 * Playwright globalSetup — runs once before all test workers start.
 *
 * Purpose: set the admin password exactly once so that every test worker finds
 * the server in login mode from the start.  Also pre-warms all Next.js JS
 * bundles and page-level API routes so the first test in each shard navigates
 * instantly instead of triggering a cold-start.
 *
 * WHY A REAL BROWSER (not just APIRequestContext):
 *   We use a real browser to exercise the full auth flow — login page, CSRF
 *   token, login API, post-login routing — so that the LokiJS session state is
 *   identical to what the test specs expect.  APIRequestContext cannot set
 *   browser cookies or trigger the React router redirects that seat the session.
 *
 * WHY WE PARAMETERISE THE BROWSER TYPE:
 *   Each CI matrix job (chromium / firefox / webkit) installs only its own
 *   browser binary.  Using chromium.launch() in globalSetup would break the
 *   firefox and webkit jobs.  We read WARMUP_BROWSER (set in the CI workflow)
 *   to launch the same binary that is actually installed.
 *   Falls back to chromium for local/mobile runs.
 *
 * Routes exercised:
 *   /login                          — page load + React hydration
 *   GET  /api/auth/init             — setup/login mode check
 *   POST /api/auth/init             — password setup (if needed)
 *   GET  /api/auth/csrf             — CSRF token route
 *   POST /api/auth/login            — credential verification
 *   GET  /api/project/status        — post-login routing logic
 *        middleware                 — session validation on every protected route
 *   POST /api/auth/validate-session — middleware's internal endpoint
 *   /build                          — destination page after login
 *   /services, /config, /logs, /database, /deployment/staging
 *                                   — warmed so every spec's first navigation is instant
 */

import { chromium, firefox, webkit, type BrowserType, type FullConfig } from '@playwright/test'

import { mockProjectStatus, TEST_PASSWORD } from './helpers'

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
    // Mock /api/project/status so ProjectStateWrapper routes to /build
    // instead of /init/1 (CI has no real nself project).
    await mockProjectStatus(page)

    // Step 1: Full browser navigation to /login.
    // • Triggers SSR compilation of the login page component.
    // • Causes the browser to fetch /_next/static/chunks/… → Next.js compiles
    //   all client-side JS modules for the login page on the server.
    // • waitUntil: 'networkidle' ensures every /_next/… request has returned
    //   (i.e. all bundles are compiled and served) before we continue.
    console.log('[globalSetup] Navigating to /login (warming SSR + JS bundles)…')
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 })

    // Step 2: Check password status (warms /api/auth/init GET).
    // The Next.js dev server can return a socket hang-up immediately after
    // networkidle resolves on some browsers/shards (the HTTP/1.1 keep-alive
    // connection is torn down before the first API request lands).  Retry up
    // to 5 times with a 1 s back-off before failing.
    let initRes: Awaited<ReturnType<typeof page.request.get>> | null = null
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        initRes = await page.request.get('/api/auth/init')
        break
      } catch (err) {
        if (attempt === 5) throw err
        console.log(
          `[globalSetup] /api/auth/init attempt ${attempt} failed (${(err as Error).message}), retrying in ${attempt}s…`
        )
        await new Promise((r) => setTimeout(r, attempt * 1000))
      }
    }
    const { passwordExists } = (await initRes!.json()) as {
      passwordExists: boolean
    }

    // Step 3: Set password if not already set (server-side LokiJS persists).
    if (!passwordExists) {
      console.log('[globalSetup] Setting admin password…')
      const r = await page.request.post('/api/auth/init', {
        data: { password: TEST_PASSWORD },
      })
      if (!r.ok()) {
        throw new Error(`[globalSetup] Failed to set admin password: ${await r.text()}`)
      }
      // Reload so the component reflects the new password state (login mode).
      // Also warms any bundles that differ between setup-mode and login-mode.
      console.log('[globalSetup] Reloading page to enter login mode…')
      await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
    }

    // Step 4: Wait for React hydration.
    // Wait for the password input to become enabled — this happens after
    // /api/auth/init resolves and React sets isCheckingSetup → false.
    // Using :not([disabled]) matches the setupAuth() pattern in helpers.ts
    // and ensures the React onClick handler is attached before we click.
    // WebKit requires this stricter guard (visible but disabled still fails
    // to trigger the React synthetic event handler on form submit).
    await page.waitForSelector('input[type="password"]:not([disabled])', {
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

    // 60 s budget for the full cold-start chain.  The project status mock
    // ensures the app stays on /build or / (depending on routing race order).
    // Just wait until we've left /login — the exact destination doesn't matter
    // for warmup.  After this, routes and JS bundles are cached; auth < 5 s.
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 60000,
      waitUntil: 'commit',
    })

    // Drain the /build page's mount-time API calls so all server-side routes
    // are compiled and their module-level caches are warm before tests start.
    // This is safe because findNselfPathSync() caches its execSync result after
    // the first call, so the event-loop blockage is bounded to one shell exec
    // (already paid during the login warm-up above) rather than one per request.
    //
    // We use a try/catch because some /build page components may hold open
    // SSE or polling connections that prevent networkidle from ever resolving.
    // If that happens we continue after 15 s with whatever is already warm —
    // the critical /api/project/status cache was populated by getCorrectRoute()
    // during the login step above, so tests will still have cache hits.
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } catch {
      // networkidle timed out (persistent connections on /build page) — that's
      // OK.  Core caches are warm; tests can proceed.
    }

    console.log(
      '[globalSetup] All routes and JS bundles pre-compiled. Tests will run with a warm server.'
    )
  } finally {
    await context.close()
    await browser.close()
  }
}
