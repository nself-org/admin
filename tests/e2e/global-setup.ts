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
 * Implementation uses Playwright's APIRequestContext (pure HTTP — no browser
 * launch).  This avoids the "browser executable not found" error that occurs
 * when each CI job installs only its own browser (chromium / firefox / webkit)
 * but globalSetup was previously trying to launch chromium in all of them.
 * The APIRequestContext manages cookies automatically (CSRF + session).
 *
 * Routes warmed in order:
 *   GET  /login                     — login page SSR compilation
 *   GET  /api/auth/init             — setup/login mode check
 *   POST /api/auth/init             — password setup (if needed)
 *   GET  /api/auth/csrf             — CSRF token generation, sets cookie
 *   POST /api/auth/login            — credential verification, sets session cookie
 *   GET  /api/project/status        — post-login routing logic
 *   GET  /build                     — triggers middleware → validate-session +
 *                                     /build page compilation
 */

import { request, type FullConfig } from '@playwright/test'

import { TEST_PASSWORD } from './helpers'

export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const base = baseURL ?? 'http://localhost:3021'

  // APIRequestContext manages cookies automatically — no browser needed.
  const ctx = await request.newContext({ baseURL: base })

  try {
    // Step 1: GET /login — triggers SSR compilation of the login page component.
    console.log('[globalSetup] Warming /login…')
    await ctx.get('/login')

    // Step 2: GET /api/auth/init — compiles the init route handler.
    console.log('[globalSetup] Checking password status…')
    const initRes = await ctx.get('/api/auth/init')
    const { passwordExists } = (await initRes.json()) as {
      passwordExists: boolean
    }

    // Step 3: POST /api/auth/init — set password if not already set.
    // Server-side LokiJS state persists for the entire server process, so all
    // test workers will see the same passwordExists=true state we set here.
    if (!passwordExists) {
      console.log('[globalSetup] Setting admin password…')
      const r = await ctx.post('/api/auth/init', {
        data: { password: TEST_PASSWORD },
      })
      if (!r.ok()) {
        throw new Error(
          `[globalSetup] Failed to set admin password: ${await r.text()}`,
        )
      }
    }

    // Step 4: GET /api/auth/csrf — compiles CSRF route handler; the response
    // cookie is stored in the APIRequestContext cookie jar automatically.
    console.log('[globalSetup] Warming CSRF route…')
    const csrfRes = await ctx.get('/api/auth/csrf')
    const { token: csrfToken } = (await csrfRes.json()) as { token: string }

    // Step 5: POST /api/auth/login — compiles login route handler; sets the
    // session cookie in the context jar for subsequent requests.
    console.log('[globalSetup] Warming login route…')
    const loginRes = await ctx.post('/api/auth/login', {
      data: { password: TEST_PASSWORD, rememberMe: false },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    if (!loginRes.ok()) {
      throw new Error(
        `[globalSetup] Login failed: ${await loginRes.text()}`,
      )
    }

    // Step 6: GET /api/project/status — compiles the routing logic called by
    // getCorrectRoute() after login.  This is a PUBLIC route, so no session
    // needed — but we have one anyway from step 5.
    console.log('[globalSetup] Warming /api/project/status…')
    await ctx.get('/api/project/status')

    // Step 7: GET /build — a PROTECTED route.  The session cookie from step 5
    // is forwarded automatically.  This triggers:
    //   • Next.js middleware execution (Edge runtime compilation)
    //   • Middleware's internal POST /api/auth/validate-session (compiles that
    //     route handler)
    //   • /build page SSR compilation
    console.log('[globalSetup] Warming /build (triggers middleware + validate-session)…')
    await ctx.get('/build')

    console.log(
      '[globalSetup] All routes pre-compiled. Tests will run with a warm server.',
    )
  } finally {
    await ctx.dispose()
  }
}
