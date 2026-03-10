/**
 * nAdmin E2E smoke tests — T-0392
 *
 * nAdmin runs at http://localhost:3021 on the user's machine.
 * Tests require nAdmin to be running: `nself admin start`
 * Skipped automatically if NSELF_ADMIN_URL is not set.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.NSELF_ADMIN_URL ?? 'http://localhost:3021';

test.use({ baseURL: BASE });

const adminRunning = !!process.env.NSELF_ADMIN_URL || process.env.CI === undefined;

test.describe('nAdmin', () => {
  test('dashboard loads with correct title', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available — set NSELF_ADMIN_URL or run nself admin start');

    await page.goto('/');
    await expect(page).toHaveTitle(/nAdmin|nself/i);
  });

  test('sidebar navigation is present', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available');

    await page.goto('/');
    const sidebar = page.locator('nav, aside, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('plugins page shows plugin list', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available');

    await page.goto('/plugins');
    // Should show at least the installed plugins section
    const list = page.locator('[data-testid="plugin-list"], ul, table').first();
    await expect(list).toBeVisible();
  });

  test('services page shows service status', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available');

    await page.goto('/services');
    const status = page.locator('[data-testid="service-status"], table, ul').first();
    await expect(status).toBeVisible();
  });

  test('settings page is accessible', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available');

    const resp = await page.goto('/settings');
    expect(resp?.status()).not.toBe(404);
  });

  test('logs page loads without crash', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available');

    const resp = await page.goto('/logs');
    expect(resp?.status()).not.toBe(500);
  });

  test('database page is accessible', async ({ page }) => {
    test.skip(!adminRunning, 'nAdmin not available');

    const resp = await page.goto('/database');
    expect(resp?.status()).not.toBe(404);
  });
});
