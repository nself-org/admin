/**
 * Purpose: Wizard step 1 (name/domain/env/database/backup fields), extracted
 *          verbatim from ProjectSetupWizard.tsx's `case 'initial':` branch.
 * Inputs: config/setConfig/validationErrors/setValidationErrors/
 *         domainPreview/setDomainPreview/showPassword/setShowPassword/
 *         showCliInstructions/setShowCliInstructions/validateDomain.
 * Outputs: JSX for the Initial Setup step.
 * Constraints: `validateDomain` must stay the orchestrator's own function —
 *              do not fork it.
 */
import { Eye, EyeOff } from 'lucide-react'
import type { ProjectConfig, ValidationErrors } from '../types'

interface InitialStepProps {
  config: ProjectConfig; setConfig: (config: ProjectConfig) => void
  validationErrors: ValidationErrors; setValidationErrors: (errors: ValidationErrors) => void
  domainPreview: string; setDomainPreview: (preview: string) => void
  showPassword: boolean; setShowPassword: (show: boolean) => void
  showCliInstructions: boolean; setShowCliInstructions: (show: boolean) => void
  validateDomain: (domain: string, environment: string) => string | null
}

export function InitialStep(props: InitialStepProps) {
  const { config, setConfig, validationErrors, setValidationErrors, domainPreview,
    setDomainPreview, showPassword, setShowPassword, showCliInstructions,
    setShowCliInstructions, validateDomain } = props
  return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Initial Project Configuration
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Essential settings and backup configuration for your project.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Project Name
                </label>
                <input
                  type="text"
                  value={config.projectName}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                    setConfig({ ...config, projectName: value })
                    if (validationErrors.projectName) {
                      setValidationErrors({
                        ...validationErrors,
                        projectName: '',
                      })
                    }
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-zinc-900 transition-all dark:bg-zinc-800 dark:text-white ${
                    validationErrors.projectName
                      ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-red-500 dark:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
                      : 'border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600'
                  }`}
                  placeholder="my_project"
                />
                {validationErrors.projectName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {validationErrors.projectName}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Environment
                </label>
                <select
                  value={config.environment}
                  onChange={(e) => {
                    const newEnv = e.target.value as ProjectConfig['environment']
                    setConfig({ ...config, environment: newEnv })
                    const error = validateDomain(config.domain, newEnv)
                    setValidationErrors({
                      ...validationErrors,
                      domain: error || '',
                    })
                  }}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="dev">Development</option>
                  <option value="staging">Staging</option>
                  <option value="prod">Production</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Domain
                  <span className="group relative ml-1 inline-block">
                    <span className="cursor-help">ⓘ</span>
                    <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-lg bg-zinc-900 p-2 text-xs text-white shadow-lg group-hover:block">
                      <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-zinc-900"></div>
                      <strong>Local development:</strong> Use &quot;localhost&quot; or
                      &quot;local.nself.org&quot;
                      <br />
                      <br />
                      <strong>Staging/Production:</strong> Your primary domain. Please note you can
                      still define multiple domains per app, remote schema, or API endpoint later.
                    </div>
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    (i.e. {domainPreview})
                  </span>
                </label>
                <input
                  type="text"
                  value={config.domain}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().trim()
                    setConfig({ ...config, domain: value })
                    setDomainPreview(`https://admin.${value || 'localhost'}`)
                    const error = validateDomain(value, config.environment)
                    setValidationErrors({
                      ...validationErrors,
                      domain: error || '',
                    })
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-zinc-900 transition-all dark:bg-zinc-800 dark:text-white ${
                    validationErrors.domain
                      ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-red-500 dark:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
                      : 'border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600'
                  }`}
                  placeholder={config.environment === 'dev' ? 'localhost' : 'example.com'}
                />
                {validationErrors.domain && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {validationErrors.domain}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Admin Email (optional)
                </label>
                <input
                  type="email"
                  value={config.adminEmail}
                  onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Database Name
                </label>
                <input
                  type="text"
                  value={config.databaseName}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    setConfig({ ...config, databaseName: value })
                    if (validationErrors.databaseName) {
                      setValidationErrors({
                        ...validationErrors,
                        databaseName: '',
                      })
                    }
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-zinc-900 transition-all dark:bg-zinc-800 dark:text-white ${
                    validationErrors.databaseName
                      ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-red-500 dark:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
                      : 'border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600'
                  }`}
                  placeholder="my_database"
                />
                {validationErrors.databaseName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {validationErrors.databaseName}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Database Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.databasePassword}
                    onChange={(e) => {
                      setConfig({ ...config, databasePassword: e.target.value })
                      if (validationErrors.databasePassword) {
                        setValidationErrors({
                          ...validationErrors,
                          databasePassword: '',
                        })
                      }
                    }}
                    className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-zinc-900 transition-all dark:bg-zinc-800 dark:text-white ${
                      validationErrors.databasePassword
                        ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-red-500 dark:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
                        : 'border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600'
                    }`}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.databasePassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {validationErrors.databasePassword}
                  </p>
                )}
              </div>
            </div>

            {/* Backup Configuration */}
            <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
              <label className="flex cursor-pointer items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.backupEnabled}
                  onChange={(e) => setConfig({ ...config, backupEnabled: e.target.checked })}
                  className="text-blue-600"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Enable Automatic Backups (host cron job)
                  <span className="group relative ml-1 inline-block">
                    <span className="cursor-help text-xs">ⓘ</span>
                    <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-zinc-900 p-2 text-xs text-white shadow-lg group-hover:block">
                      <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-zinc-900"></div>
                      Schedules backups via host system cron. The nself CLI runs backup operations
                      using temporary containers to export database and volumes. Default: Daily at 2
                      AM. Not a Docker service.
                    </div>
                  </span>
                </span>
              </label>
              {config.backupEnabled && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={config.backupSchedule}
                    onChange={(e) => setConfig({ ...config, backupSchedule: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                    placeholder="0 2 * * * (daily at 2 AM)"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Cron format: minute hour day month weekday
                  </p>
                </div>
              )}
            </div>

            {config.environment === 'prod' && (
              <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Production Mode:</strong> Make sure to use strong passwords and secrets.
                  Consider moving sensitive values to .env.secrets file.
                </p>
              </div>
            )}

            {/* Use CLI instead option */}
            <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setShowCliInstructions(!showCliInstructions)}
                className="text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Use CLI instead
              </button>
              {showCliInstructions && (
                <div className="mt-4 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                  <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">
                    Run these commands in your terminal:
                  </p>
                  <code className="block rounded bg-zinc-900 p-2 text-xs whitespace-pre text-zinc-100 dark:bg-zinc-950">
                    {`# Initialize your project with all environment files
nself init --full ${config.projectName}

# Edit .env.local file to configure your settings

# Build the project
nself build

# Start services
nself start`}
                  </code>
                </div>
              )}
            </div>
          </div>
  )
}
