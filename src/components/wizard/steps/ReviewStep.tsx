/**
 * Purpose: Wizard final step (read-only config summary + build progress),
 *          extracted verbatim from ProjectSetupWizard.tsx's `case 'review':`.
 * Inputs: config, commandOutput (live text from handleBuild(), orchestrator-owned).
 * Outputs: JSX for the Review step.
 * Constraints: Purely presentational — never mutates config.
 */
import { CheckCircle, Package } from 'lucide-react'
import type { ProjectConfig } from '../types'

interface ReviewStepProps {
  config: ProjectConfig
  commandOutput: string
}

export function ReviewStep(props: ReviewStepProps) {
  const { config, commandOutput } = props

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Review Configuration & Build Process
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Review your configuration and understand what will be built when you click &quot;Build
        Project&quot;.
      </p>

      {/* Build Process Overview */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h4 className="mb-3 flex items-center font-medium text-blue-900 dark:text-blue-100">
          <Package className="mr-2 h-4 w-4" />
          Build Process
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start">
            <span className="mr-2 font-mono text-blue-700 dark:text-blue-300">1.</span>
            <div>
              <span className="font-medium text-blue-900 dark:text-blue-100">
                Write Configuration
              </span>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                Creates .env.local with all service configurations
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="mr-2 font-mono text-blue-700 dark:text-blue-300">2.</span>
            <div>
              <span className="font-medium text-blue-900 dark:text-blue-100">Run nself build</span>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                Executes the CLI to generate docker-compose.yml and service configs
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="mr-2 font-mono text-blue-700 dark:text-blue-300">3.</span>
            <div>
              <span className="font-medium text-blue-900 dark:text-blue-100">
                Redirect to Start
              </span>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                Opens the service startup page to launch your stack
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded bg-blue-100 p-2 dark:bg-blue-900/40">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Target Directory:</strong>{' '}
            {process.env.NSELF_PROJECT_PATH || '../nself-project'}
          </p>
        </div>
      </div>

      {/* Project Configuration */}
      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
        <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">1. Project Configuration</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-zinc-600 dark:text-zinc-400">Project Name:</div>
          <div className="font-medium text-zinc-900 dark:text-white">{config.projectName}</div>
          <div className="text-zinc-600 dark:text-zinc-400">Environment:</div>
          <div className="font-medium text-zinc-900 dark:text-white">{config.environment}</div>
          <div className="text-zinc-600 dark:text-zinc-400">Domain:</div>
          <div className="font-medium text-zinc-900 dark:text-white">{config.domain}</div>
          <div className="text-zinc-600 dark:text-zinc-400">Database:</div>
          <div className="font-medium text-zinc-900 dark:text-white">{config.databaseName}</div>
        </div>
      </div>

      {/* Required Services */}
      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
        <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">2. Required Services</h4>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-zinc-900 dark:text-white">PostgreSQL Database</span>
            <span className="ml-auto text-xs text-zinc-500">
              Port {config.postgres?.port || 5432}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-zinc-900 dark:text-white">Hasura GraphQL Engine</span>
            <span className="ml-auto text-xs text-zinc-500">
              Port {config.hasura?.port || 8080}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-zinc-900 dark:text-white">Nginx Reverse Proxy</span>
            <span className="ml-auto text-xs text-zinc-500">
              Port {config.nginx?.httpPort || 80}
              {config.nginx?.sslMode && config.nginx.sslMode !== 'none'
                ? `/${config.nginx?.httpsPort || 443}`
                : ''}
              {config.nginx?.sslMode &&
                config.nginx.sslMode !== 'none' &&
                ` (${config.nginx.sslMode})`}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-zinc-900 dark:text-white">Authentication Service</span>
            <span className="ml-auto text-xs text-zinc-500">JWT-based Auth</span>
          </div>
          {config.backupEnabled && (
            <div className="flex items-center text-sm">
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-zinc-900 dark:text-white">Automated Backups (host cron)</span>
              <span className="ml-auto text-xs text-zinc-500">
                {config.backupSchedule || 'Daily at 2 AM'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Services */}
      {(config.optionalServices.redis ||
        config.optionalServices.search.enabled ||
        config.optionalServices.mail.enabled ||
        config.optionalServices.adminUI) && (
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
          <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">3. Optional Services</h4>
          <div className="space-y-2">
            {config.optionalServices.redis && (
              <div className="flex items-center text-sm">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-zinc-900 dark:text-white">Redis Cache</span>
                <span className="ml-auto text-xs text-zinc-500">
                  Port {config.redisConfig?.port || 6379}
                </span>
              </div>
            )}
            {config.optionalServices.search.enabled &&
              config.optionalServices.search.provider === 'elasticsearch' && (
                <div className="flex items-center text-sm">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  <span className="text-zinc-900 dark:text-white">ElasticSearch</span>
                  <span className="ml-auto text-xs text-zinc-500">
                    Port {config.searchConfig?.port || 9200}
                  </span>
                </div>
              )}
            {config.optionalServices.mail.enabled && (
              <div className="flex items-center text-sm">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-zinc-900 dark:text-white">Email Service</span>
                <span className="ml-auto text-xs text-zinc-500">
                  {config.mailConfig?.provider || 'SMTP'}
                </span>
              </div>
            )}
            {config.optionalServices.adminUI && (
              <div className="flex items-center text-sm">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-zinc-900 dark:text-white">nAdmin Dashboard</span>
                <span className="ml-auto text-xs text-zinc-500">
                  Port {config.nadminConfig?.port || 3021}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Services Summary */}
      {config.customServices.length > 0 && (
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
          <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">
            4. Custom Backend Services
          </h4>
          <div className="space-y-2">
            {config.customServices.map((service) => (
              <div key={service.name} className="flex items-center text-sm">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-zinc-900 dark:text-white">{service.name}</span>
                <span className="ml-auto text-xs text-zinc-500">
                  {service.framework} | Port {service.port}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frontend Apps Summary */}
      {config.frontendApps.length > 0 && (
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
          <h4 className="mb-3 font-medium text-zinc-900 dark:text-white">
            5. Frontend Applications
          </h4>
          <div className="space-y-2">
            {config.frontendApps
              .filter((app) => app.enabled)
              .map((app) => (
                <div key={app.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    <span className="text-zinc-900 dark:text-white">{app.displayName}</span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {app.framework} | Table: {app.tablePrefix}* | Port: {app.port}
                    {config.environment === 'dev' && app.deployment === 'local' && (
                      <span className="ml-2">
                        | {app.subdomain}.{config.domain}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 dark:border-blue-800 dark:from-blue-900/20 dark:to-sky-900/20">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-white">Ready to Build</h4>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {5 +
                (config.optionalServices.redis ? 1 : 0) +
                (config.optionalServices.search.enabled ? 1 : 0) +
                (config.optionalServices.mail.enabled ? 1 : 0) +
                (config.optionalServices.adminUI ? 1 : 0) +
                (config.optionalServices.monitoring ? 5 : 0) +
                config.customServices.length}{' '}
              services will be configured
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {5 +
                (config.optionalServices.redis ? 1 : 0) +
                (config.optionalServices.search.enabled ? 1 : 0) +
                (config.optionalServices.mail.enabled ? 1 : 0) +
                (config.optionalServices.adminUI ? 1 : 0) +
                (config.optionalServices.monitoring ? 5 : 0) +
                config.customServices.length}
            </p>
            <p className="text-xs text-zinc-500">Total Services</p>
          </div>
        </div>
      </div>

      {/* Build Output */}
      {commandOutput && (
        <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
          <pre>{commandOutput}</pre>
        </div>
      )}
    </div>
  )
}
