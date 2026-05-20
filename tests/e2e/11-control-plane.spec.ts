import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

// ── Mock data ─────────────────────────────────────────────────────────────────

/** A fully-manage-capable inventory — two environments, four servers. */
const MANAGE_INVENTORY = {
  environments: [
    {
      name: 'staging',
      kind: 'remote',
      servers: [
        {
          name: 'staging-app-01',
          host: 'nself@167.235.233.65',
          role: 'app',
          capability: 'manage',
          primary: true,
          sshKeyRef: 'NSELF_SSH_KEY_STAGING',
        },
        {
          name: 'staging-lb-01',
          host: 'nself@167.235.233.66',
          role: 'lb',
          capability: 'manage',
          sshKeyRef: 'NSELF_SSH_KEY_STAGING',
        },
      ],
    },
    {
      name: 'production',
      kind: 'remote',
      servers: [
        {
          name: 'prod-app-01',
          host: 'nself@5.75.235.42',
          role: 'app',
          capability: 'manage',
          primary: true,
          sshKeyRef: 'NSELF_SSH_KEY_PROD',
        },
        {
          name: 'prod-obs-01',
          host: 'nself@5.75.235.43',
          role: 'observability',
          capability: 'manage',
          sshKeyRef: 'NSELF_SSH_KEY_PROD',
        },
      ],
    },
  ],
}

/** Mixed inventory: one manage server + one read-only. */
const PARTIAL_INVENTORY = {
  environments: [
    {
      name: 'staging',
      kind: 'remote',
      servers: [
        {
          name: 'staging-app-01',
          host: 'nself@167.235.233.65',
          role: 'app',
          capability: 'manage',
          primary: true,
          sshKeyRef: 'NSELF_SSH_KEY_STAGING',
        },
        {
          name: 'staging-obs-01',
          host: 'nself@167.235.233.67',
          role: 'observability',
          capability: 'read-only',
          reason: ['SSH key missing: NSELF_SSH_KEY_STAGING not set'],
          sshKeyRef: 'NSELF_SSH_KEY_STAGING',
        },
      ],
    },
  ],
}

/** Hidden-only inventory: one server hidden. */
const HIDDEN_INVENTORY = {
  environments: [
    {
      name: 'staging',
      kind: 'remote',
      servers: [
        {
          name: 'staging-app-01',
          host: '',
          role: 'app',
          capability: 'hidden',
          reason: ['Host not configured'],
        },
      ],
    },
  ],
}

/** Empty inventory. */
const EMPTY_INVENTORY = { environments: [] }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stub GET /api/control-plane with the given inventory payload. */
async function mockInventory(
  page: Page,
  inventory:
    | typeof MANAGE_INVENTORY
    | typeof EMPTY_INVENTORY
    | typeof PARTIAL_INVENTORY
    | typeof HIDDEN_INVENTORY
) {
  await page.route('**/api/control-plane*', (route) => {
    const url = new URL(route.request().url())
    const action = url.searchParams.get('action') ?? 'list'
    if (action === 'list') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          action: 'list',
          data: inventory,
          timestamp: new Date().toISOString(),
        }),
      })
    } else {
      // probe — reuse same inventory with probed flag
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          action: 'probe',
          data: { ...inventory, probed: true },
          timestamp: new Date().toISOString(),
        }),
      })
    }
  })
}

/** Stub POST /api/control-plane for add/remove actions, capturing last request. */
async function mockInventoryPost(
  page: Page,
  responseBody: Record<string, unknown>
): Promise<() => Request | null> {
  let lastRequest: Request | null = null
  await page.route('**/api/control-plane', async (route) => {
    if (route.request().method() === 'POST') {
      lastRequest = route.request()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    } else {
      await route.continue()
    }
  })
  return () => lastRequest
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('Control-Plane Inventory Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  // ── 01: navigate to /environments ─────────────────────────────────────────

  test('01 — navigates to /environments and shows page title', async ({ page }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // H1 gradient title
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Environments')
  })

  // ── 02: server cards render with name + role ───────────────────────────────

  test('02 — server cards render with name, host, and role', async ({ page }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // staging-app-01 card must appear
    const card = page.locator('text=staging-app-01').first()
    await expect(card).toBeVisible()

    // Its host and role text should appear nearby
    const cardContainer = page
      .locator('[class*="rounded-lg"]')
      .filter({
        hasText: 'staging-app-01',
      })
      .first()
    await expect(cardContainer).toContainText('app')
  })

  // ── 03: manage capability badge shown ─────────────────────────────────────

  test('03 — "manage" capability badge is shown for manage-capable servers', async ({ page }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // At least one "manage" badge should be visible
    const manageBadge = page.locator('text=manage').first()
    await expect(manageBadge).toBeVisible()
  })

  // ── 04: read-only badge shown for partial-access servers ──────────────────

  test('04 — "read-only" capability badge appears for partial-access servers', async ({ page }) => {
    await mockInventory(page, PARTIAL_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    const readOnlyBadge = page.locator('text=read-only').first()
    await expect(readOnlyBadge).toBeVisible()
  })

  // ── 05: partial-access banner renders ─────────────────────────────────────

  test('05 — partial-access banner renders when some servers are read-only', async ({ page }) => {
    await mockInventory(page, PARTIAL_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // Banner contains "Partial access" text
    const banner = page.locator('text=Partial access').first()
    await expect(banner).toBeVisible()

    // Banner also includes the probe hint
    const probeTip = page.locator('text=nself env target probe').first()
    await expect(probeTip).toBeVisible()
  })

  // ── 06: hidden servers are not rendered ───────────────────────────────────

  test('06 — hidden servers do not appear as cards', async ({ page }) => {
    await mockInventory(page, HIDDEN_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // "hidden" badge must not appear in server card area
    // The page should show "All servers hidden" message
    const hiddenMsg = page.locator('text=All servers hidden').first()
    await expect(hiddenMsg).toBeVisible()
  })

  // ── 07: empty state ────────────────────────────────────────────────────────

  test('07 — empty state renders "No servers in inventory" when inventory is empty', async ({
    page,
  }) => {
    await mockInventory(page, EMPTY_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    const emptyMsg = page.locator('text=No servers in inventory').first()
    await expect(emptyMsg).toBeVisible()

    // "Add First Server" CTA present
    const addBtn = page.locator('button:has-text("Add First Server")').first()
    await expect(addBtn).toBeVisible()
  })

  // ── 08: "primary" tag shown on primary server ─────────────────────────────

  test('08 — primary tag shown on primary server card', async ({ page }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // "primary" span (sky-colored badge) should appear
    const primaryTag = page.locator('text=primary').first()
    await expect(primaryTag).toBeVisible()
  })

  // ── 09: add-server modal opens and includes name/host/role fields ──────────

  test('09 — "Add Server" button opens modal with name, host, role inputs', async ({ page }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // Click "Add Server" button in the page header
    const addBtn = page.locator('button:has-text("Add Server")').first()
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    // Modal should appear
    const modal = page.locator('text=Add Server to Inventory').first()
    await expect(modal).toBeVisible()

    // Required fields
    await expect(page.locator('input[placeholder="prod-01"]')).toBeVisible()
    await expect(page.locator('input[placeholder="5.75.235.42"]')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()

    // Close modal
    await page.locator('button:has-text("Cancel")').click()
    await expect(modal).not.toBeVisible()
  })

  // ── 10: add-server POST hits correct API with name/host/role params ────────

  test('10 — add-server form submits POST to /api/control-plane with correct body', async ({
    page,
  }) => {
    await mockInventory(page, EMPTY_INVENTORY)

    // Capture POST request
    const capturedBodies: Array<Record<string, unknown>> = []
    await page.route('**/api/control-plane', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
        capturedBodies.push(body)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, action: 'add', name: 'test-server-01' }),
        })
      } else {
        // Fulfill GET requests with EMPTY_INVENTORY so networkidle resolves in CI
        // (route.continue() would forward to a real server that doesn't exist in CI)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            action: 'list',
            data: EMPTY_INVENTORY,
            timestamp: new Date().toISOString(),
          }),
        })
      }
    })

    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // Click "Add First Server" in empty-state
    await page.locator('button:has-text("Add First Server")').click()
    await expect(page.locator('text=Add Server to Inventory')).toBeVisible()

    // Fill the form
    await page.locator('input[placeholder="prod-01"]').fill('test-server-01')
    await page.locator('input[placeholder="5.75.235.42"]').fill('10.0.0.1')
    await page.locator('select').selectOption('primary')

    // Submit — scope to inside the dialog to avoid the header "Add Server"
    // button.  In webkit the modal backdrop (.fixed.inset-0) intercepts pointer
    // events on the header button, so .first() is not reliable across browsers.
    await page.locator('[role="dialog"] button:has-text("Add Server")').click()

    // Verify captured POST body
    await page.waitForTimeout(500)
    expect(capturedBodies.length).toBeGreaterThanOrEqual(1)
    const lastBody = capturedBodies[capturedBodies.length - 1]
    expect(lastBody.action).toBe('add')
    expect(lastBody.name).toBe('test-server-01')
    expect(lastBody.host).toBe('10.0.0.1')
    expect(lastBody.role).toBe('primary')
  })

  // ── 11: deploy CLI command reference appears on page ──────────────────────

  test('11 — CLI reference section shows "nself deploy <env> --server <name>" command', async ({
    page,
  }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // The CLI reference at the bottom of the page
    const deployCmd = page.locator('text=nself deploy').first()
    await expect(deployCmd).toBeVisible()

    // Verify --server param hint is visible
    const serverParam = page.locator('text=--server').first()
    await expect(serverParam).toBeVisible()
  })

  // ── 12: environment card links to /environments/<name> ────────────────────

  test('12 — environment card header links to /environments/<name>', async ({ page }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    // Link to staging env detail page
    const stagingLink = page.locator('a[href="/environments/staging"]').first()
    await expect(stagingLink).toBeVisible()
    await expect(stagingLink).toContainText('staging')
  })

  // ── 13: full-access badge shown when all servers manage-capable ───────────

  test('13 — "full access" badge shown on environment with all manage servers', async ({
    page,
  }) => {
    await mockInventory(page, MANAGE_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    const fullAccessBadge = page.locator('text=full access').first()
    await expect(fullAccessBadge).toBeVisible()
  })

  // ── 14: "partial" badge shown on environment with mixed capabilities ───────

  test('14 — "partial" badge shown on environment with mixed-capability servers', async ({
    page,
  }) => {
    await mockInventory(page, PARTIAL_INVENTORY)
    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    const partialBadge = page.locator('text=partial').first()
    await expect(partialBadge).toBeVisible()
  })

  // ── 15: offline state renders when CLI is not responding ──────────────────

  test('15 — offline state renders "nself is not responding" when CLI is unavailable', async ({
    page,
  }) => {
    // 502 = CLI returned non-JSON (offline)
    await page.route('**/api/control-plane*', (route) => {
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'CLI returned non-JSON output',
          stdout: '',
          stderr: 'nself: command not found',
        }),
      })
    })

    await page.goto('/environments', { waitUntil: 'domcontentloaded' })

    const offlineMsg = page.locator('text=nself is not responding').first()
    await expect(offlineMsg).toBeVisible()

    // Retry button present
    const retryBtn = page.locator('button:has-text("Retry")').first()
    await expect(retryBtn).toBeVisible()
  })

  // ── 16: refresh button re-fetches inventory ────────────────────────────────

  test('16 — Refresh button triggers a new GET /api/control-plane?action=list request', async ({
    page,
  }) => {
    let requestCount = 0
    await page.route('**/api/control-plane*', async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('action') === 'list' || !url.searchParams.has('action')) {
        requestCount++
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            action: 'list',
            data: MANAGE_INVENTORY,
            timestamp: new Date().toISOString(),
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/environments', { waitUntil: 'domcontentloaded' })
    expect(requestCount).toBeGreaterThanOrEqual(1)

    const initialCount = requestCount

    // Click Refresh
    const refreshBtn = page.locator('button:has-text("Refresh")').first()
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()

    // Wait for the new request
    await page.waitForTimeout(800)
    expect(requestCount).toBeGreaterThan(initialCount)
  })
})
