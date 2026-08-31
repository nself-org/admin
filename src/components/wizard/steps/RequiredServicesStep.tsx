/**
 * Purpose: Wizard step 2 — Postgres/Hasura/nginx/auth/storage configuration
 *          cards, extracted verbatim from ProjectSetupWizard.tsx's
 *          `case 'required-services':` render branch.
 * Inputs: config, setSelectedService (opens the shared ServiceDetailModal
 *         the orchestrator renders).
 * Outputs: JSX for the Required Services step.
 * Constraints: Clicking a card only calls setSelectedService — the modal
 *              itself stays in the orchestrator (ProjectSetupWizard.tsx).
 */
import { Database, Globe, Lock, Server, Wrench } from 'lucide-react'
import type { ProjectConfig } from '../types'

interface RequiredServicesStepProps {
  config: ProjectConfig
  setSelectedService: (service: string | null) => void
}

export function RequiredServicesStep(props: RequiredServicesStepProps) {
  const { config, setSelectedService } = props

  return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Required Services Configuration
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Configure core services that power your nself stack.
            </p>

            <div className="space-y-4">
              {/* PostgreSQL */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Database className="mt-0.5 h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">PostgreSQL</h4>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Primary database with advanced features
                      </p>
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        Version: {config.postgres.version} | Port: {config.postgres.port} | Max
                        Connections: {config.postgres.maxConnections}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService('postgres')}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Wrench className="mr-1 inline h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>

              {/* Hasura */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Server className="mt-0.5 h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">Hasura GraphQL</h4>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Instant GraphQL API on your database
                      </p>
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        Version: {config.hasura.version} | Console:{' '}
                        {config.hasura.consoleEnabled ? 'Enabled' : 'Disabled'} | Dev Mode:{' '}
                        {config.hasura.devMode ? 'On' : 'Off'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService('hasura')}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Wrench className="mr-1 inline h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>

              {/* Nginx */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Globe className="mt-0.5 h-5 w-5 text-sky-500" />
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">Nginx Proxy</h4>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Reverse proxy and SSL termination
                      </p>
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        SSL: {config.nginx.sslMode} | HTTP: {config.nginx.httpPort} | HTTPS:{' '}
                        {config.nginx.httpsPort}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService('nginx')}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Wrench className="mr-1 inline h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>

              {/* Auth Service */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Lock className="mt-0.5 h-5 w-5 text-red-500" />
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">
                        Authentication Service
                      </h4>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        JWT-based authentication system
                      </p>
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        JWT Expires: {config.auth.jwtExpiresIn}s | SMTP: {config.auth.smtpHost}:
                        {config.auth.smtpPort}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService('auth')}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Wrench className="mr-1 inline h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
  )
}
