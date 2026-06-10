# Testing

This document covers the E2E and unit testing strategy for ɳSelf Admin.

## E2E Tests (Playwright)

E2E tests live in `tests/e2e/` and run against a production build (`pnpm run build && pnpm start`) to avoid per-route cold-start compilation delays.

### Browser Matrix

| Browser                 | CI (Linux headless)      | Local macOS dev                       |
| ----------------------- | ------------------------ | ------------------------------------- |
| Chromium                | Included                 | Included                              |
| Firefox                 | Included                 | Included                              |
| WebKit (Desktop Safari) | **Excluded** — see below | Valid via `--project=webkit`          |
| Mobile Chrome           | Included                 | Included                              |
| Mobile Safari           | **Excluded** — see below | Valid via `--project='Mobile Safari'` |

### WebKit CI Exclusion

WebKit is excluded from Linux headless E2E CI runs due to system-level display and font stack dependencies unavailable in GitHub Actions Ubuntu runners. Chromium and Firefox ship their own bundled headless binaries and are stable. Mobile Safari uses the WebKit engine and is excluded for the same reason.

WebKit testing on macOS local dev is still valid:

```bash
pnpm playwright test --project=webkit
pnpm playwright test --project='Mobile Safari'
```

Tracking issue for re-enable: https://github.com/nself-org/admin/issues/39

### Running E2E Tests Locally

```bash
# Build first (required — dev server is too slow for E2E)
pnpm run build

# Run all E2E tests
pnpm playwright test

# Run a specific browser
pnpm playwright test --project=chromium
pnpm playwright test --project=firefox

# Run a specific spec file
pnpm playwright test tests/e2e/02-authentication.spec.ts

# Open the HTML report
pnpm playwright show-report
```

### CI Sharding

In CI, E2E tests are sharded across multiple runners to keep wall-clock time under 15 minutes. See `.github/workflows/e2e-tests.yml` for the shard configuration.

## Unit Tests (Jest)

Unit tests use Jest + React Testing Library. Run with:

```bash
pnpm test
pnpm test --watch
pnpm test --coverage
```

## Type Checking

```bash
pnpm run type-check
```

## Lint

```bash
pnpm lint
```
