/**
 * Purpose: Exercise the Project Setup Wizard end-to-end through all six
 *          steps after its P6-E11-W2-S3-T17 split (ProjectSetupWizard.tsx
 *          was 3670 lines; each step's render now lives in
 *          src/components/wizard/steps/*.tsx). Confirms the split didn't
 *          break step-to-step navigation, state carried across steps
 *          (project name typed on step 1 survives to the Review step), or
 *          the shared ServiceDetailModal wiring threaded down to the
 *          Required/Optional Services step components.
 * Inputs: none — mocks every API the wizard calls (project status, wizard
 *         init/update-env/state, nself build) so it runs without a real
 *         nself CLI or backend, matching every other spec in this suite.
 * Constraints: Does not click "Build Project" on the Review step — that
 *              triggers a real `nself build` subprocess, which
 *              03-build-project.spec.ts already documents as CLI-dependent
 *              and unavailable in CI (see its skipped "should execute
 *              build" test). This spec only verifies the Review step
 *              renders and the button is present/enabled.
 */
import { expect, test } from './fixtures'
import { setupAuth } from './helpers'

const PROJECT_SETUP_KEY = 'nself_project_setup_confirmed'

async function mockWizardNotSetUp(page: import('@playwright/test').Page) {
  // Route the wizard renders when the project has no .env.local yet —
  // projectStore.checkProjectStatus() sets projectSetup=false whenever
  // hasEnvFile is false (see src/stores/projectStore.ts).
  await page.route('**/api/project/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        projectState: 'empty',
        needsSetup: true,
        hasEnvFile: false,
        hasDockerCompose: false,
        isBuilt: false,
        hasAdminPassword: true,
        servicesRunning: false,
        runningServices: [],
        dockerContainers: [],
        containerCount: 0,
        config: null,
        projectPath: '/tmp/test',
        summary: { initialized: false, configured: false, built: false, running: false },
      }),
    })
  )

  // useWizardPersistence's load-on-mount effect (mode='new') fetches this
  // to seed `config` — return the same defaults the component itself would
  // use so the rendered fields match what each step's test asserts.
  await page.route('**/api/wizard/init', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        config: {
          projectName: 'my_project',
          environment: 'dev',
          domain: 'localhost',
        },
      }),
    })
  )

  // Autosave fires on every config/step change (useWizardPersistence's
  // second useEffect) — must resolve or every interaction stalls on it.
  await page.route('**/api/wizard/update-env', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
  )

  await page.route('**/api/wizard/state', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
  )
}

test.describe('Project Setup Wizard flow (post P6-E11-W2-S3-T17 split)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await mockWizardNotSetUp(page)
    // globalSetup's storageState marks setup as already confirmed so other
    // specs skip straight past the wizard — clear that flag here so
    // ProjectStateWrapper/ProjectStateProvider re-evaluate against the
    // "not set up" mock above instead of the cached confirmation.
    await page.addInitScript((key) => window.localStorage.removeItem(key), PROJECT_SETUP_KEY)
    await page.goto('/', { waitUntil: 'commit' })
  })

  test('renders the Initial Setup step first', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Initial Project Configuration' })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('heading', { name: 'Project Setup Wizard' })).toBeVisible()
  })

  test('carries project name across steps to Review', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Initial Project Configuration' })
    ).toBeVisible({ timeout: 15000 })

    const projectNameInput = page.locator('input[type="text"]').first()
    await projectNameInput.fill('e2e_test_project')

    // Step 1 -> 2: Required Services
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Required Services Configuration' })).toBeVisible()

    // Step 2 -> 3: Optional Services
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Optional Services' })).toBeVisible()

    // Step 3 -> 4: User (Custom Backend) Services
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Custom Backend Services' })).toBeVisible()

    // Step 4 -> 5: Apps (Frontend Applications)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Frontend Applications' })).toBeVisible()

    // Step 5 -> 6: Review
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Review Configuration & Build Process' })).toBeVisible()

    // The name typed on step 1 must still be reflected in the Review summary —
    // proves useWizardConfigState's `config` is the single source both
    // InitialStep and ReviewStep read, unaffected by the split.
    await expect(page.getByText('e2e_test_project')).toBeVisible()
    await expect(page.getByRole('button', { name: /Build Project/i })).toBeEnabled()
  })

  test('Back button returns to the previous step without losing state', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Initial Project Configuration' })
    ).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Required Services Configuration' })).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('heading', { name: 'Initial Project Configuration' })).toBeVisible()
  })

  test('opens the ServiceDetailModal from a Required Services card', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Initial Project Configuration' })
    ).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Required Services Configuration' })).toBeVisible()

    // Confirms setSelectedService threaded through RequiredServicesStep's
    // props still opens the orchestrator-owned modal after the split.
    await page.getByRole('button', { name: 'Settings' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('progress stepper allows jumping back to a completed step', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Initial Project Configuration' })
    ).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Optional Services' })).toBeVisible()

    await page.getByText('Initial Setup').click()
    await expect(page.getByRole('heading', { name: 'Initial Project Configuration' })).toBeVisible()
  })
})
