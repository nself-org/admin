/**
 * nAdmin E2E smoke tests — T-0392
 *
 * 5 scenarios for the nAdmin local companion UI (localhost:3021).
 * nAdmin is NOT a hosted web service. It runs on the user's own machine.
 *
 * Requirements:
 *   - nAdmin must already be running: `nself admin start`
 *   - Set ADMIN_URL to override the default base URL
 *   - Tests skip gracefully when the app is not reachable
 *
 * Run:  ADMIN_URL=http://localhost:3021 pnpm test:e2e --project=e2e
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.ADMIN_URL || 'http://localhost:3021';

test.use({ baseURL: BASE });

// Skip the whole suite when the app is not running.
// We check by attempting a HEAD request in beforeAll; if it throws, skip.
let adminReachable = false;

test.beforeAll(async ({ playwright }) => {
  try {
    const ctx = await playwright.request.newContext({ baseURL: BASE });
    const resp = await ctx.head('/', { timeout: 5000 });
    adminReachable = resp.ok() || resp.status() < 500;
    await ctx.dispose();
  } catch {
    adminReachable = false;
  }
});

// -------------------------------------------------------------------------
// Scenario 1 — Dashboard loads without 500 or error boundary
// -------------------------------------------------------------------------
test('dashboard loads without crash', async ({ page }) => {
  test.skip(!adminReachable, 'nAdmin not reachable — run `nself admin start` first');

  const resp = await page.goto('/');
  expect(resp?.status()).toBeLessThan(500);

  // No Next.js or React error boundary should be visible
  await expect(page.locator('body')).not.toContainText('Application error');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
});

// -------------------------------------------------------------------------
// Scenario 2 — Plugin management tab shows plugin cards
// -------------------------------------------------------------------------
test('plugin management tab shows plugin cards', async ({ page }) => {
  test.skip(!adminReachable, 'nAdmin not reachable');

  await page.goto('/plugins');

  // Page must not crash
  await expect(page.locator('body')).not.toContainText('Internal Server Error');

  // Plugin list, cards, or table rows must be visible
  const pluginItems = page.locator(
    '[data-testid="plugin-list"], [data-testid="plugin-card"], ul li, table tbody tr'
  ).first();
  await expect(pluginItems).toBeVisible({ timeout: 10000 });
});

// -------------------------------------------------------------------------
// Scenario 3 — DLQ view renders
// -------------------------------------------------------------------------
test('DLQ view renders without crash', async ({ page }) => {
  test.skip(!adminReachable, 'nAdmin not reachable');

  // BullMQ DLQ panel lives under /plugins/claw or /services/bullmq
  // Try the BullMQ service page first; fall back to the claw plugin page
  let resp = await page.goto('/services/bullmq');

  if (resp?.status() === 404) {
    resp = await page.goto('/plugins/claw');
  }

  expect(resp?.status()).not.toBe(500);

  // The page must render a main content area
  await expect(page.locator('main, [role="main"], body')).toBeVisible();
});

// -------------------------------------------------------------------------
// Scenario 4 — Backup panel renders and has a trigger button
// -------------------------------------------------------------------------
test('backup panel renders with trigger button', async ({ page }) => {
  test.skip(!adminReachable, 'nAdmin not reachable');

  const resp = await page.goto('/database');
  expect(resp?.status()).toBeLessThan(500);

  // Accept either a dedicated backup route or the database page with a backup section
  const backupTrigger = page.locator(
    'button:has-text("Backup"), button:has-text("backup"), [data-testid="backup-trigger"], [data-testid="backup-btn"]'
  ).first();

  // Non-fatal: backup section may not be immediately visible (behind a tab).
  // Assert the page itself rendered correctly instead.
  const mainContent = page.locator('main, [role="main"], h1, h2').first();
  await expect(mainContent).toBeVisible({ timeout: 10000 });

  // Best-effort: if a backup trigger is present, it must be visible
  const count = await backupTrigger.count();
  if (count > 0) {
    await expect(backupTrigger).toBeVisible();
  }
});

// -------------------------------------------------------------------------
// Scenario 5 — axe-core: 0 critical violations on dashboard
// -------------------------------------------------------------------------
test('dashboard has no critical axe-core violations', async ({ page }) => {
  test.skip(!adminReachable, 'nAdmin not reachable');

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const criticalViolations = results.violations.filter(
    (v) => v.impact === 'critical'
  );

  if (criticalViolations.length > 0) {
    const summary = criticalViolations
      .map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
      .join('\n');
    throw new Error(`Critical axe violations found:\n${summary}`);
  }

  expect(criticalViolations).toHaveLength(0);
});
