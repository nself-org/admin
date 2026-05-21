/**
 * Playwright globalSetup — runs once before all test workers start.
 *
 * Two responsibilities:
 *
 *   1. Pre-warm Next.js routes and ensure the admin password is set so the
 *      server starts in login mode.  Without this, the first test in every
 *      shard pays the cold-start compilation cost.
 *
 *   2. **Save an authenticated browser storageState to `playwright/.auth/admin.json`.**
 *      Every test project in `playwright.config.ts` then loads this file via
 *      `use.storageState`, which means each test starts with the
 *      `nself-session` cookie and `nself_project_setup_confirmed` localStorage
 *      flag already in place.  This is the canonical Playwright auth-reuse
 *      pattern (https://playwright.dev/docs/auth) and eliminates the
 *      per-test login flow entirely.
 *
 *      Why this matters for WebKit: doing the login once in globalSetup and
 *      replaying the cookie via storageState removes the cross-test cookie-jar
 *      timing race that WebKit + APIRequestContext exhibited, where the
 *      `Set-Cookie` from /api/auth/login was sometimes committed AFTER the
 *      following page.goto() began — causing middleware to bounce the test to
 *      /login mid-navigation ("Navigation interrupted by another navigation
 *      to /login").  storageState bypasses per-test cookie-setting entirely;
 *      every test context is hydrated with the cookie before its first navigation.
 *
 * WHY WE PARAMETERISE THE BROWSER TYPE:
 *   Each CI matrix job (chromium / firefox / webkit) installs only its own
 *   browser binary.  Using chromium.launch() in globalSetup would break the
 *   firefox and webkit jobs.  We read WARMUP_BROWSER (set in the CI workflow)
 *   to launch the same binary that is actually installed.
 *   Falls back to chromium for local/mobile runs.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  chromium,
  firefox,
  webkit,
  type APIResponse,
  type BrowserContext,
  type BrowserType,
  type FullConfig,
  type Page,
} from '@playwright/test'

import { mockProjectStatus, TEST_PASSWORD } from './helpers'

const BROWSER_TYPES: Record<string, BrowserType> = { chromium, firefox, webkit }

// Single shared storage-state file.  Each CI job runs ONE browser, so this
// file holds the cookie + localStorage produced by whichever browser globalSetup
// ran with.  Local runs default to chromium, which produces a state file that
// works for every other browser project too (cookies are origin-scoped, not
// browser-engine-scoped).
const STORAGE_STATE_PATH = path.resolve('playwright/.auth/admin.json')

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
    // Step 0: Poll the admin server until it answers before doing anything
    // else.  playwright.config.ts already waits for `next start` to bind, but
    // a cold / over-subscribed runner can accept the TCP connection a few
    // seconds before the route handlers compile.  Polling /login here (bounded
    // to 180 s) absorbs that gap so the auth flow below never races a
    // not-yet-ready server.
    await waitForServerReady(page, base, 180000)

    // Mock /api/project/status so ProjectStateWrapper routes to /build
    // instead of /init/1 (CI has no real nself project).
    await mockProjectStatus(page)

    // Step 1: Full browser navigation to /login.
    console.log('[globalSetup] Navigating to /login (warming SSR + JS bundles)…')
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 })

    // Step 2: Check password status (warms /api/auth/init GET).  Retry on
    // intermittent socket hang-ups after networkidle.
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
      console.log('[globalSetup] Reloading page to enter login mode…')
      await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
    }

    // Step 4: Wait for React hydration so the login form is fully interactive.
    await page.waitForSelector('input[type="password"]:not([disabled])', {
      state: 'visible',
      timeout: 15000,
    })

    // Step 5: API-based login.  CSP-safe across all three browser engines.
    // Doing it once in globalSetup lets us capture the resulting cookie +
    // localStorage state and replay it for every test via `use.storageState`.
    console.log('[globalSetup] Logging in via API (CSP-safe across all browsers)…')

    // 5a: Fetch CSRF token (warms the /api/auth/csrf route).
    await page.request.get('/api/auth/csrf')

    // 5b: POST login credentials.  Retry on transient server-side failures
    // (5xx / connection resets) with exponential backoff so a slow-but-
    // eventually-ready admin server on a cold runner does not abort the entire
    // shard.  A genuine auth failure (4xx) is fatal immediately — retrying it
    // would only mask a real problem.
    const loginRes = await postLoginWithRetry(page, base)

    // 5c: Verify the session cookie landed in the browser context's cookie jar
    // BEFORE we save the storageState.  WebKit occasionally commits the
    // Set-Cookie header a few ms after the response resolves; without this
    // poll the saved storageState could be missing the cookie and every test
    // would start unauthenticated.
    const cookieLanded = await waitForCookie(context, 'nself-session', 5000)
    if (!cookieLanded) {
      throw new Error(
        '[globalSetup] nself-session cookie did not land in the cookie jar within 5s — cannot save storageState'
      )
    }

    // 5d: Navigate to /build with the session cookie so the page's first-party
    // origin is the authenticated one.  Captures any localStorage that
    // ProjectStateWrapper / AuthProvider write on mount into the saved state.
    console.log(
      '[globalSetup] Session established — navigating to /build to seed first-party state…'
    )
    try {
      await page.goto('/build', { waitUntil: 'domcontentloaded', timeout: 30000 })
    } catch {
      console.log('[globalSetup] /build navigation settled (SSE may keep load pending).')
    }

    // 5e: Pre-populate the project-setup-confirmed flag so ProjectStateWrapper
    // renders children immediately instead of showing the first-time spinner.
    // This was previously injected per-test via addInitScript in setupAuth();
    // folding it into the saved storageState means every test inherits it.
    await page.evaluate(() => {
      try {
        localStorage.setItem('nself_project_setup_confirmed', 'true')
      } catch {
        // localStorage may be unavailable in some edge contexts — non-fatal.
      }
    })

    // 5f: Drain any /build-mount API calls so module-level caches are warm.
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } catch {
      // networkidle timed out (persistent connections on /build page) — that's
      // OK.  Core caches are warm; tests can proceed.
    }

    // Step 6: Save storage state to disk.  Each test project in
    // playwright.config.ts loads this file via `use.storageState`.
    await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true })
    await context.storageState({ path: STORAGE_STATE_PATH })
    console.log(`[globalSetup] Saved authenticated storage state to ${STORAGE_STATE_PATH}`)
  } finally {
    await context.close()
    await browser.close()
  }
}

/**
 * Poll the browser context's cookie jar until `cookieName` appears, or the
 * timeout expires.  Returns true if the cookie is present, false otherwise.
 * Used to guard against the WebKit Set-Cookie commit race before saving
 * storage state.
 */
async function waitForCookie(
  context: BrowserContext,
  cookieName: string,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const cookies = await context.cookies()
    if (cookies.some((c) => c.name === cookieName)) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

/**
 * Purpose:    Poll the admin server's /login route until it responds, so the
 *             auth flow never races a server that has bound its port but not
 *             yet compiled its route handlers on a cold CI runner.
 * Inputs:     `page` — Playwright page for issuing requests; `base` — server
 *             base URL; `timeoutMs` — total budget before giving up.
 * Outputs:    Resolves once /login returns any HTTP response; throws with a
 *             clear message only after the full budget is exhausted.
 * Constraints: Treats any HTTP status as "server is up" — a 200 on /login and a
 *             307 redirect both prove the handler is live.  Only a connection
 *             error (server not yet accepting requests) is retried.
 */
async function waitForServerReady(page: Page, base: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError = 'no attempt made'
  let attempt = 0
  while (Date.now() < deadline) {
    attempt++
    try {
      const res = await page.request.get(`${base}/login`, { timeout: 15000 })
      console.log(`[globalSetup] Server ready — /login returned ${res.status()} (attempt ${attempt})`)
      return
    } catch (err) {
      lastError = (err as Error).message
      console.log(`[globalSetup] Server not ready (attempt ${attempt}): ${lastError} — retrying in 3s …`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  throw new Error(
    `[globalSetup] Admin server did not become ready within ${Math.round(timeoutMs / 1000)} s — last error: ${lastError}`
  )
}

/**
 * Purpose:    POST the admin login credentials, retrying on transient
 *             server-side failures (5xx / connection resets) with exponential
 *             backoff so a slow-but-eventually-ready server does not abort the
 *             shard.
 * Inputs:     `page` — Playwright page for issuing the request; `base` — server
 *             base URL (for clearer error messages).
 * Outputs:    The successful APIResponse.  Throws on a genuine auth failure
 *             (4xx) immediately, or after retries are exhausted on persistent
 *             5xx / connection errors.
 * Constraints: 4xx is never retried — retrying a real auth rejection would mask
 *             a true failure rather than absorb startup latency.
 */
async function postLoginWithRetry(page: Page, base: string): Promise<APIResponse> {
  const maxAttempts = 8
  let delayMs = 1000
  let lastDetail = 'no attempt made'
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await page.request.post('/api/auth/login', {
        data: { password: TEST_PASSWORD, rememberMe: false },
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok()) return res

      const status = res.status()
      lastDetail = `${status} ${res.statusText()} — ${await res.text()}`
      // 4xx = genuine auth failure; do not retry, surface immediately.
      if (status < 500) {
        throw new Error(`[globalSetup] Login API rejected credentials: ${lastDetail}`)
      }
      // 5xx = server still warming up; retry with backoff.
      console.log(
        `[globalSetup] Login API ${status} (attempt ${attempt}/${maxAttempts}) — retrying in ${delayMs / 1000}s …`
      )
    } catch (err) {
      // Re-throw the explicit 4xx rejection above; retry connection errors.
      if (/rejected credentials/.test((err as Error).message)) throw err
      lastDetail = (err as Error).message
      console.log(
        `[globalSetup] Login API request error (attempt ${attempt}/${maxAttempts}): ${lastDetail} — retrying in ${delayMs / 1000}s …`
      )
    }
    await new Promise((r) => setTimeout(r, delayMs))
    if (delayMs < 16000) delayMs *= 2
  }
  throw new Error(
    `[globalSetup] Login API never succeeded against ${base} after ${maxAttempts} attempts — last: ${lastDetail}`
  )
}
