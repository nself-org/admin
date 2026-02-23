import { test as base } from '@playwright/test'
import { mockProjectStatus } from './helpers'
import { BackupRestorePage } from './page-objects/BackupRestorePage'
import { BuildPage } from './page-objects/BuildPage'
import { ConfigPage } from './page-objects/ConfigPage'
import { DashboardPage } from './page-objects/DashboardPage'
import { DatabasePage } from './page-objects/DatabasePage'
import { DeploymentPage } from './page-objects/DeploymentPage'
import { HelpPage } from './page-objects/HelpPage'
import { LoginPage } from './page-objects/LoginPage'
import { LogsPage } from './page-objects/LogsPage'
import { ServicesPage } from './page-objects/ServicesPage'

type PageFixtures = {
  loginPage: LoginPage
  dashboardPage: DashboardPage
  buildPage: BuildPage
  servicesPage: ServicesPage
  databasePage: DatabasePage
  configPage: ConfigPage
  logsPage: LogsPage
  backupRestorePage: BackupRestorePage
  deploymentPage: DeploymentPage
  helpPage: HelpPage
}

// Extend the base test so that every test page in CI has the project-status
// mock registered before any navigation.  Without the mock, ProjectStateWrapper
// fetches the real /api/project/status which returns needsSetup: true in CI
// (no nself instance) and immediately redirects every authenticated page to
// /init/1, causing all non-init tests to fail.
//
// The mock is applied at the fixture level (not just in setupAuth) so that
// tests which navigate directly without going through setupAuth — such as
// 01-initial-setup: "navigate to dashboard after login" — are also protected.
export const test = base.extend<PageFixtures>({
  page: async ({ page }, use) => {
    // Only install the mock in CI.  Local dev runs against a real nself project
    // and should exercise the genuine /api/project/status response.
    if (process.env.CI) {
      await mockProjectStatus(page)
    }
    await use(page)
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },
  buildPage: async ({ page }, use) => {
    await use(new BuildPage(page))
  },
  servicesPage: async ({ page }, use) => {
    await use(new ServicesPage(page))
  },
  databasePage: async ({ page }, use) => {
    await use(new DatabasePage(page))
  },
  configPage: async ({ page }, use) => {
    await use(new ConfigPage(page))
  },
  logsPage: async ({ page }, use) => {
    await use(new LogsPage(page))
  },
  backupRestorePage: async ({ page }, use) => {
    await use(new BackupRestorePage(page))
  },
  deploymentPage: async ({ page }, use) => {
    await use(new DeploymentPage(page))
  },
  helpPage: async ({ page }, use) => {
    await use(new HelpPage(page))
  },
})

export { expect } from '@playwright/test'
