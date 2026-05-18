# E2E Tests Quick Start Guide

## Installation

Playwright and browsers are already installed. If you need to reinstall:

```bash
pnpm install
npx playwright install
```

## Running Tests

### Quick Commands

```bash
# Run all tests (all browsers)
pnpm test:e2e

# Run in headed mode (watch browser)
pnpm test:e2e:headed

# Run with UI (interactive mode)
pnpm test:e2e:ui

# Run specific browser
pnpm test:e2e:chromium
pnpm test:e2e:firefox
pnpm test:e2e:webkit

# Run mobile tests only
pnpm test:e2e:mobile

# Debug specific test
pnpm test:e2e:debug
```

### Running Specific Tests

```bash
# Single test file
npx playwright test 01-initial-setup.spec.ts

# Specific test case
npx playwright test -g "should login with correct password"

# Single test file, single browser
npx playwright test 02-authentication.spec.ts --project=chromium
```

## Viewing Results

### HTML Report

After running tests:

```bash
pnpm test:e2e:report
```

This opens an interactive HTML report showing:

- ✅ Passed tests (green)
- ❌ Failed tests (red)
- ⏭️ Skipped tests (yellow)
- Screenshots on failure
- Videos on failure
- Execution traces

### CI Reports

In GitHub Actions:

- Go to Actions tab
- Click on workflow run
- View test summary in PR
- Download artifacts (screenshots, videos, reports)

## Test Structure

### 10 Critical Flows

1. **01-initial-setup.spec.ts** - First-time setup
2. **02-authentication.spec.ts** - Login/logout
3. **03-build-project.spec.ts** - Build operations
4. **04-service-management.spec.ts** - Services
5. **05-database-operations.spec.ts** - Database
6. **06-environment-config.spec.ts** - Config
7. **07-logs-viewer.spec.ts** - Logs
8. **08-backup-restore.spec.ts** - Backups
9. **09-deployment.spec.ts** - Deployments
10. **10-help-and-search.spec.ts** - Help/search

### Page Objects

Reusable page objects in `page-objects/`:

- LoginPage
- DashboardPage
- BuildPage
- ServicesPage
- DatabasePage
- ConfigPage
- LogsPage
- BackupRestorePage
- DeploymentPage
- HelpPage

## Debugging Failed Tests

### 1. Run in Headed Mode

```bash
npx playwright test 02-authentication.spec.ts --headed
```

Watch the browser and see what's happening.

### 2. Run in Debug Mode

```bash
npx playwright test 02-authentication.spec.ts --debug
```

Opens Playwright Inspector with:

- Step through test execution
- Inspect elements
- View console logs
- Modify selectors

### 3. View Trace

If test failed in CI:

```bash
npx playwright show-trace test-results/trace.zip
```

### 4. View Screenshots

Failed tests automatically save screenshots:

```
test-results/
  └── [test-name]-[browser]/
      └── screenshot.png
```

### 5. View Videos

Failed tests automatically save videos:

```
test-results/
  └── [test-name]-[browser]/
      └── video.webm
```

## Writing New Tests

### 1. Use Codegen

Generate test code automatically:

```bash
pnpm test:e2e:codegen
```

This opens a browser and records your actions.

### 2. Create New Spec File

```typescript
import { test, expect } from './fixtures'
import { setupAuth } from './helpers'

test.describe('My Feature Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('should do something', async ({ myPage }) => {
    await myPage.goto()
    await expect(myPage.element).toBeVisible()
  })
})
```

### 3. Create Page Object (if needed)

```typescript
import { type Page, type Locator, expect } from '@playwright/test'

export class MyPage {
  readonly page: Page
  readonly element: Locator

  constructor(page: Page) {
    this.page = page
    this.element = page.locator('[data-testid="my-element"]')
  }

  async goto() {
    await this.page.goto('/my-page')
  }
}
```

## Best Practices

### ✅ Do

- Use page objects for selectors
- Use `data-testid` attributes
- Use `waitFor()` instead of `waitForTimeout()`
- Add accessibility tests
- Test responsive design
- Test keyboard navigation
- Add descriptive test names

### ❌ Don't

- Hardcode selectors in tests
- Use `waitForTimeout()` (flaky)
- Skip error handling tests
- Test only happy paths
- Ignore mobile viewports
- Forget accessibility

## Common Issues

### Tests Timeout

**Problem:** Tests timeout waiting for elements

**Solution:**

```typescript
// Increase timeout for specific test
test(
  'slow operation',
  async ({ page }) => {
    // Your test
  },
  { timeout: 60000 }
) // 60 seconds

// Or wait for specific element
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 })
```

### Element Not Found

**Problem:** `Element not found` error

**Solution:**

1. Check if element exists: `await page.locator('selector').isVisible()`
2. Wait for element: `await page.waitForSelector('selector')`
3. Use better selector: `data-testid` instead of class names

### Flaky Tests

**Problem:** Tests pass sometimes, fail other times

**Solution:**

1. Remove `waitForTimeout()` calls
2. Wait for specific conditions: `waitForLoadState('networkidle')`
3. Use `toBeVisible()` before interactions
4. Check for loading states

### Can't Find Dev Server

**Problem:** Tests can't connect to http://localhost:3021

**Solution:**

1. Make sure dev server is not already running
2. Check port 3021 is available
3. Verify `webServer` config in playwright.config.ts

## CI/CD Integration

Tests run automatically on:

- ✅ Push to `main` or `develop`
- ✅ Pull requests to `main` or `develop`

### Viewing CI Results

1. Go to GitHub Actions tab
2. Click on workflow run
3. View test summary
4. Download artifacts (screenshots, videos)

### Making Tests Pass in CI

1. Run tests locally first: `pnpm test:e2e`
2. Fix any failures
3. Commit changes
4. Push to branch
5. Verify CI passes

## Performance

### Parallel Execution

Tests run in parallel by default:

- Local: Uses all CPU cores
- CI: Single worker (sequential)

### Speeding Up Tests

```bash
# Run only changed tests
npx playwright test --only-changed

# Run with more workers
npx playwright test --workers=4

# Skip slow tests
npx playwright test --grep-invert @slow
```

## Help & Support

- **Documentation:** `tests/e2e/README.md`
- **Playwright Docs:** https://playwright.dev
- **Examples:** Look at existing test files
- **Codegen:** `pnpm test:e2e:codegen`

## Quick Reference

| Command                  | Description          |
| ------------------------ | -------------------- |
| `pnpm test:e2e`          | Run all tests        |
| `pnpm test:e2e:headed`   | Watch tests run      |
| `pnpm test:e2e:ui`       | Interactive UI mode  |
| `pnpm test:e2e:debug`    | Debug mode           |
| `pnpm test:e2e:chromium` | Chromium only        |
| `pnpm test:e2e:firefox`  | Firefox only         |
| `pnpm test:e2e:webkit`   | WebKit/Safari only   |
| `pnpm test:e2e:mobile`   | Mobile devices only  |
| `pnpm test:e2e:report`   | View HTML report     |
| `pnpm test:e2e:codegen`  | Generate test code   |
| `pnpm test:all`          | Run unit + E2E tests |

---

**Total Tests:** 114 unique tests × 5 browsers = **570 test runs**
