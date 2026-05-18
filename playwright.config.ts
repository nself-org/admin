import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* globalSetup pre-warms all Next.js routes and sets the admin password once
   * before any test worker starts.  Without it, the cold-start compilation of
   * 6+ routes in the auth chain (login page, csrf, login API, project/status,
   * middleware, validate-session, /build) takes 35–50 s and blows the timeout. */
  globalSetup: './tests/e2e/global-setup.ts',

  /* Per-test timeout: includes beforeEach + test body.
   * With pre-warmed routes, setupAuth() completes in < 10 s.
   * 30 s gives the test body a comfortable budget after auth. */
  timeout: 30000,

  /* Default timeout for individual expect() assertions.
   * Playwright default is 5 s, but several pages (build, services, database,
   * config) show a loading skeleton before the h1 renders.  20 s gives the
   * skeleton enough time to clear without making failure feedback too slow. */
  expect: {
    timeout: 20000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* On CI each shard runs on a 2-core runner; 2 workers keeps CPU saturated
   * without thrashing.  Locally, use all available cores. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  /* When sharding (CI), write blob reports so the merge job can combine them
   * into a single HTML report.  Always keep list for inline job logs. */
  reporter: process.env.CI ? [['blob'], ['list']] : [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3021',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Relax Firefox's strict origin policy so that page.evaluate() does not
        // throw "The operation is insecure" when running against localhost.
        // The root cause is fixed in helpers.ts (navigate before evaluate), but
        // this preference provides an additional safety net for any future
        // page.evaluate() calls made before a full navigation.
        launchOptions: {
          firefoxUserPrefs: {
            'security.fileuri.strict_origin_policy': false,
          },
        },
      },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3021',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
