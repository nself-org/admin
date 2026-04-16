'use client'

import { useWizardStore } from '@/stores/wizardStore'
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Hammer,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { StepWrapper } from '../StepWrapper'

interface ConfigSummary {
  projectName: string
  environment: string
  domain: string
  databaseName: string
  databasePassword: string
  hasuraEnabled: boolean
  authEnabled: boolean
  redisEnabled: boolean
  minioEnabled: boolean
  monitoringEnabled: boolean
  // Individual monitoring service flags
  prometheusEnabled?: boolean
  grafanaEnabled?: boolean
  lokiEnabled?: boolean
  tempoEnabled?: boolean
  alertmanagerEnabled?: boolean
  nodeExporterEnabled?: boolean
  postgresExporterEnabled?: boolean
  cadvisorEnabled?: boolean
  mlflowEnabled: boolean
  mailpitEnabled: boolean
  searchEnabled: boolean
  searchEngine?: string
  functionsEnabled: boolean
  nadminEnabled: boolean
  customServices: Array<{
    name: string
    framework: string
    port: number
    route?: string
  }>
  frontendApps: Array<{
    displayName: string
    systemName?: string
    tablePrefix?: string
    localPort?: number
    productionUrl?: string
  }>
  backupEnabled: boolean
  ENV?: string
  BASE_DOMAIN?: string
  POSTGRES_DB?: string
  POSTGRES_PASSWORD?: string
  REDIS_ENABLED?: string
  STORAGE_ENABLED?: string
  MINIO_ENABLED?: string // Deprecated, for backwards compat
  MONITORING_ENABLED?: string
  MLFLOW_ENABLED?: string
  MAILPIT_ENABLED?: string
  SEARCH_ENABLED?: string
  SEARCH_ENGINE?: string
  NSELF_ADMIN_ENABLED?: string
  SERVICES_ENABLED?: string
}

interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export default function InitStep6() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [validating, setValidating] = useState(false)
  const [config, setConfig] = useState<ConfigSummary | null>(null)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    [],
  )
  const [showIssues, setShowIssues] = useState(false)
  const [autoFixing, setAutoFixing] = useState(false)
  const [fixedIssuesCount, setFixedIssuesCount] = useState(0)
  const [appliedFixes, setAppliedFixes] = useState<string[]>([])

  const validateConfiguration = useCallback(
    async (summary: ConfigSummary, rawConfig: any) => {
      setValidating(true)
      setAutoFixing(true)
      const issues: ValidationIssue[] = []
      let fixCount = 0
      let portFixCount = 0

      // Auto-fix configuration issues
      const fixes: Record<string, string> = {}
      const portFixes: Record<string, string> = {}
      const fixDescriptions: string[] = []

      try {
        // Call validation API endpoint
        const response = await fetch('/api/wizard/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: rawConfig }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.issues) {
            // Auto-fix known issues ONLY if the values don't already exist
            for (const issue of result.issues) {
              if (
                issue.field === 'HASURA_METADATA_DATABASE_URL' &&
                !rawConfig.HASURA_METADATA_DATABASE_URL
              ) {
                // Auto-construct database URL
                const dbUser =
                  rawConfig.POSTGRES_USER ||
                  rawConfig.postgresUser ||
                  'postgres'
                const dbPass =
                  rawConfig.POSTGRES_PASSWORD ||
                  rawConfig.databasePassword ||
                  'nself-dev-password'
                const dbName =
                  rawConfig.POSTGRES_DB || rawConfig.databaseName || 'nself'
                fixes.HASURA_METADATA_DATABASE_URL = `postgres://${dbUser}:${dbPass}@postgres:5432/${dbName}`
                fixDescriptions.push(
                  'Added HASURA_METADATA_DATABASE_URL for database connection',
                )
                fixCount++
              } else if (
                issue.field === 'minio' &&
                !rawConfig.MINIO_ROOT_USER
              ) {
                fixes.MINIO_ROOT_USER = 'minioadmin'
                fixes.MINIO_ROOT_PASSWORD = 'minioadmin-password'
                fixDescriptions.push(
                  'Added MinIO credentials for storage service',
                )
                fixCount++
              } else if (
                issue.field === 'search' &&
                !rawConfig.MEILI_MASTER_KEY
              ) {
                fixes.MEILI_MASTER_KEY = 'meilisearch-master-key-32-chars'
                fixDescriptions.push(
                  'Added MeiliSearch master key for search service',
                )
                fixCount++
              } else if (
                issue.field === 'grafana' &&
                !rawConfig.GRAFANA_ADMIN_PASSWORD
              ) {
                fixes.GRAFANA_ADMIN_PASSWORD = 'grafana-admin-password'
                fixDescriptions.push(
                  'Added Grafana admin password for monitoring',
                )
                fixCount++
              } else if (
                issue.field === 'monitoring' &&
                issue.message.includes('TEMPO_ENABLED') &&
                rawConfig.TEMPO_ENABLED !== 'true'
              ) {
                fixes.TEMPO_ENABLED = 'true'
                if (rawConfig.ALERTMANAGER_ENABLED !== 'true') {
                  fixes.ALERTMANAGER_ENABLED = 'true'
                }
                fixDescriptions.push(
                  'Enabled missing monitoring services (Tempo, Alertmanager)',
                )
                fixCount++
              } else {
                // Can't auto-fix this issue
                issues.push(issue)
              }
            }
          }
        }
      } catch (error) {
        console.error('Validation error:', error)
      }

      // Combine all fixes (config fixes + port fixes)
      const allFixes = { ...fixes, ...portFixes }
      const totalFixCount = fixCount + portFixCount

      // Combine fix descriptions
      if (portFixCount > 0) {
        fixDescriptions.push(
          `Fixed ${portFixCount} port conflict${portFixCount > 1 ? 's' : ''} for frontend apps`,
        )
      }

      // Apply fixes if any
      if (Object.keys(allFixes).length > 0) {
        try {
          await fetch('/api/wizard/update-env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: allFixes,
              step: 'auto-fix',
            }),
          })
          // Show the count and descriptions of fixes that were just applied
          setFixedIssuesCount(totalFixCount)
          setAppliedFixes(fixDescriptions)

          // After applying fixes, reload configuration without re-validating
          // The fixes have been saved, so next time the page loads, no issues will be found
          setTimeout(() => {
            // Reload configuration without validation after fixes
            window.location.reload()
          }, 500)
        } catch (error) {
          console.error('Error applying fixes:', error)
        }
      } else {
        // No fixes were needed
        setFixedIssuesCount(0)
        setAppliedFixes([])
      }

      // Client-side validation for remaining issues
      const isDev =
        summary.environment === 'dev' || summary.environment === 'development'

      // Only warn about default project name if not in dev
      if (
        !isDev &&
        (!summary.projectName || summary.projectName === 'my_project')
      ) {
        issues.push({
          field: 'projectName',
          message: 'Project name is using default value',
          severity: 'warning',
        })
      }

      // Only warn about default password in production/staging
      if (
        !isDev &&
        (!summary.databasePassword ||
          summary.databasePassword === 'nself-dev-password')
      ) {
        issues.push({
          field: 'databasePassword',
          message:
            'Database password is using default (insecure for production)',
          severity: 'warning',
        })
      }

      // Check for port conflicts (errors that can't be auto-fixed)
      const usedPorts = new Map<number, string>()

      // Add default service ports
      usedPorts.set(5432, 'PostgreSQL')
      usedPorts.set(8080, 'Hasura')
      usedPorts.set(4000, 'Auth')
      usedPorts.set(80, 'Nginx HTTP')
      usedPorts.set(443, 'Nginx HTTPS')

      // Add optional service ports if enabled
      if (summary.redisEnabled) usedPorts.set(6379, 'Redis')
      if (summary.minioEnabled) {
        usedPorts.set(9000, 'MinIO API')
        usedPorts.set(9001, 'MinIO Console')
      }
      if (summary.mlflowEnabled) usedPorts.set(5000, 'MLflow')
      if (summary.mailpitEnabled) {
        usedPorts.set(1025, 'Mailpit SMTP')
        usedPorts.set(8025, 'Mailpit Web')
      }
      if (summary.searchEnabled) usedPorts.set(7700, 'MeiliSearch')
      if (summary.monitoringEnabled) {
        usedPorts.set(9090, 'Prometheus')
        usedPorts.set(3000, 'Grafana')
        usedPorts.set(3100, 'Loki')
        usedPorts.set(3200, 'Tempo')
        usedPorts.set(9093, 'Alertmanager')
      }
      if (summary.nadminEnabled) usedPorts.set(3021, 'nself Admin')

      // Auto-fix port conflicts for custom services

      if (summary.customServices.length > 0) {
        const fixedCustomServices: any[] = []

        summary.customServices.forEach((service, index) => {
          if (usedPorts.has(service.port)) {
            // Find next available port starting from 4001
            let newPort = 4001
            while (usedPorts.has(newPort)) {
              newPort++
            }

            // Create fixed service
            const fixedService = { ...service, port: newPort }
            fixedCustomServices.push(fixedService)
            usedPorts.set(newPort, service.name)

            // Add to fixes
            portFixes[`CS_${index + 1}`] =
              `${service.name}:${service.framework}:${newPort}:${service.route || ''}`
            portFixCount++
          } else {
            fixedCustomServices.push(service)
            usedPorts.set(service.port, service.name)
          }
        })

        // If we fixed any ports, update the store
        if (
          fixedCustomServices.some(
            (service, index) =>
              service.port !== summary.customServices[index]?.port,
          )
        ) {
          try {
            const { setCustomServices } = useWizardStore.getState()
            setCustomServices(fixedCustomServices)
          } catch (error) {
            console.error('Error updating custom services store:', error)
          }
        }
      }

      // Auto-fix port conflicts for frontend apps
      if (summary.frontendApps.length > 0) {
        const fixedFrontendApps: any[] = []

        summary.frontendApps.forEach((app, index) => {
          if (app.localPort && usedPorts.has(app.localPort)) {
            // Find next available port starting from 3001
            let newPort = 3001
            while (usedPorts.has(newPort)) {
              newPort++
            }

            // Create fixed app
            const fixedApp = { ...app, localPort: newPort }
            fixedFrontendApps.push(fixedApp)
            usedPorts.set(newPort, app.displayName || 'Frontend App')

            // Add to fixes
            portFixes[`FRONTEND_APP_${index + 1}_PORT`] = newPort.toString()
            portFixCount++
          } else {
            fixedFrontendApps.push(app)
            if (app.localPort) {
              usedPorts.set(app.localPort, app.displayName || 'Frontend App')
            }
          }
        })

        // If we fixed any ports, update the store
        if (
          fixedFrontendApps.some(
            (app, index) =>
              app.localPort !== summary.frontendApps[index]?.localPort,
          )
        ) {
          try {
            const { setFrontendApps } = useWizardStore.getState()
            setFrontendApps(fixedFrontendApps)
          } catch (error) {
            console.error('Error updating frontend apps store:', error)
          }
        }
      }

      setValidationIssues(issues)
      setValidating(false)
      setAutoFixing(false)
    },
    [],
  )

  const loadConfiguration = useCallback(
    async (skipValidation = false) => {
      try {
        const response = await fetch('/api/wizard/init')
        if (response.ok) {
          const data = await response.json()
          if (data.config) {
            // Merge all config data including raw env vars
            const fullConfig: ConfigSummary = {
              projectName:
                data.config.projectName ||
                data.config.PROJECT_NAME ||
                'my_project',
              environment:
                data.config.environment || data.config.ENV || 'development',
              domain:
                data.config.domain || data.config.BASE_DOMAIN || 'localhost',
              databaseName:
                data.config.databaseName || data.config.POSTGRES_DB || 'nself',
              databasePassword:
                data.config.databasePassword ||
                data.config.POSTGRES_PASSWORD ||
                '',
              hasuraEnabled: data.config.hasuraEnabled !== false, // Always true for required service
              authEnabled: data.config.authEnabled !== false, // Always true for required service
              nadminEnabled:
                data.config.nadminEnabled ||
                data.config.NSELF_ADMIN_ENABLED === 'true' ||
                data.config.adminEnabled ||
                false,
              redisEnabled:
                data.config.redisEnabled ||
                data.config.REDIS_ENABLED === 'true',
              minioEnabled:
                data.config.minioEnabled ||
                data.config.STORAGE_ENABLED === 'true' ||
                data.config.MINIO_ENABLED === 'true',
              mlflowEnabled:
                data.config.mlflowEnabled ||
                data.config.MLFLOW_ENABLED === 'true',
              mailpitEnabled:
                data.config.mailpitEnabled ||
                data.config.MAILPIT_ENABLED === 'true',
              searchEnabled:
                data.config.searchEnabled ||
                data.config.SEARCH_ENABLED === 'true',
              searchEngine:
                data.config.searchEngine ||
                data.config.SEARCH_ENGINE ||
                'meilisearch',
              functionsEnabled:
                data.config.functionsEnabled ||
                data.config.FUNCTIONS_ENABLED === 'true',
              monitoringEnabled:
                data.config.monitoringEnabled ||
                data.config.MONITORING_ENABLED === 'true',
              // Load individual monitoring service flags
              prometheusEnabled: data.config.PROMETHEUS_ENABLED === 'true',
              grafanaEnabled: data.config.GRAFANA_ENABLED === 'true',
              lokiEnabled: data.config.LOKI_ENABLED === 'true',
              tempoEnabled: data.config.TEMPO_ENABLED === 'true',
              alertmanagerEnabled: data.config.ALERTMANAGER_ENABLED === 'true',
              nodeExporterEnabled: data.config.NODE_EXPORTER_ENABLED === 'true',
              postgresExporterEnabled:
                data.config.POSTGRES_EXPORTER_ENABLED === 'true',
              cadvisorEnabled: data.config.CADVISOR_ENABLED === 'true',
              customServices:
                data.config.customServices || data.config.userServices || [],
              frontendApps: data.config.frontendApps || [],
              backupEnabled:
                data.config.backupEnabled ||
                data.config.BACKUP_ENABLED === 'true' ||
                data.config.DB_BACKUP_ENABLED === 'true',
              ...data.config, // Include all raw data
            }
            setConfig(fullConfig)
            // Run sanity check after loading (unless we're reloading after fixes)
            if (!skipValidation) {
              validateConfiguration(fullConfig, data.config)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load configuration:', error)
      } finally {
        setDataLoaded(true)
      }
    },
    [validateConfiguration],
  )

  const checkAndLoadConfiguration = useCallback(async () => {
    // First check if env file exists
    try {
      const statusRes = await fetch('/api/project/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (!statusData.hasEnvFile) {
          // No env file - redirect to /init to create it
          router.push('/init')
          return
        }
      }
    } catch (error) {
      console.error('Error checking project status:', error)
    }

    // Load configuration if env file exists
    loadConfiguration()
  }, [router, loadConfiguration])

  // Load configuration from .env.local on mount
  useEffect(() => {
    checkAndLoadConfiguration()
  }, [checkAndLoadConfiguration])

  const handleBack = () => {
    router.push('/init/5')
  }

  const handleBuild = async () => {
    // Check for validation errors first
    const errors = validationIssues.filter((i) => i.severity === 'error')
    if (errors.length > 0) {
      alert('Please fix the validation errors before building.')
      return
    }

    setLoading(true)

    try {
      // First, finalize and organize the env file
      const finalizeResponse = await fetch('/api/wizard/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize configuration')
      }

      // Do a final save of the entire configuration
      const response = await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: config,
          step: 'review',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save final configuration')
      }

      // Redirect to build page with wizard flag
      router.push('/build?from=wizard')
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Failed to save configuration. Please try again.')
      setLoading(false)
    }
  }

  // Show loading skeleton while initial data loads
  if (!dataLoaded || !config) {
    return (
      <StepWrapper>
        <div className="space-y-4">
          {/* Validation box skeleton */}
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
              <div className="flex-1">
                <div className="mb-2 h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                <div className="h-3 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"></div>
              </div>
            </div>
          </div>

          {/* Color legend skeleton */}
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="flex flex-wrap gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-3 w-3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary cards skeletons */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="mb-3 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                    <div className="h-4 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Total summary skeleton */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-5 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
              <div className="h-8 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
            </div>
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div className="h-3 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StepWrapper>
    )
  }

  // Generate dynamic monitoring bundle description based on enabled services
  const getMonitoringBundleDescription = () => {
    if (!config.monitoringEnabled) return null

    // When monitoring is enabled, nself automatically enables all 8 monitoring services
    // Unless explicitly disabled, all are enabled by default
    const enabledMonitoringServices = [
      config.prometheusEnabled !== false && 'Prometheus',
      config.grafanaEnabled !== false && 'Grafana',
      config.lokiEnabled !== false && 'Loki',
      config.tempoEnabled !== false && 'Tempo',
      config.alertmanagerEnabled !== false && 'Alertmanager',
      // These three are always enabled when monitoring is enabled
      'Node Exporter',
      'PostgreSQL Exporter',
      'cAdvisor',
    ].filter(Boolean)

    if (enabledMonitoringServices.length === 0) {
      return 'Monitoring Bundle (None enabled)'
    }

    return `Monitoring Bundle (${enabledMonitoringServices.join(', ')})`
  }

  const enabledOptionalServices = [
    'nself Admin UI', // Always show as enabled since user is viewing this interface
    config.redisEnabled && 'Redis Cache',
    config.minioEnabled && 'Storage (MinIO)',
    config.functionsEnabled && 'Functions (Serverless)',
    config.mailpitEnabled && 'Email Service (Mailpit)',
    config.searchEnabled &&
      `Search Service (${(config.searchEngine || 'meilisearch').charAt(0).toUpperCase() + (config.searchEngine || 'meilisearch').slice(1)})`,
    config.mlflowEnabled && 'MLflow Platform',
    getMonitoringBundleDescription(),
  ].filter(Boolean)

  // Core services: PostgreSQL, Hasura, Auth, Nginx (4)
  const coreServicesCount = 4 // Always enabled

  // Calculate actual monitoring services count
  // When monitoring is enabled, nself automatically enables all 8 monitoring services:
  // Prometheus, Grafana, Loki, Tempo, Alertmanager, Node Exporter, PostgreSQL Exporter, cAdvisor
  const monitoringServicesCount = config.monitoringEnabled ? 8 : 0

  const optionalServicesCount =
    1 + // nself-admin is always counted since user is viewing this interface
    (config.redisEnabled ? 1 : 0) +
    (config.minioEnabled ? 1 : 0) +
    (config.mlflowEnabled ? 1 : 0) +
    (config.mailpitEnabled ? 1 : 0) +
    (config.searchEnabled ? 1 : 0) +
    (config.functionsEnabled ? 1 : 0) +
    monitoringServicesCount // Count actual enabled monitoring services

  // Calculate total services (don't use API value as it may be incorrect before build)
  const totalServices =
    coreServicesCount + optionalServicesCount + config.customServices.length

  return (
    <StepWrapper>
      {/* Auto-fixed issues */}
      {(fixedIssuesCount > 0 ||
        validationIssues.filter((i) => i.severity === 'warning').length >
          0) && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-green-900 dark:text-green-300">
                  {fixedIssuesCount > 0 && (
                    <span>
                      {fixedIssuesCount}{' '}
                      {fixedIssuesCount === 1 ? 'issue' : 'issues'}{' '}
                      automatically fixed
                    </span>
                  )}
                  {fixedIssuesCount > 0 &&
                    validationIssues.filter((i) => i.severity === 'warning')
                      .length > 0 &&
                    ', '}
                  {validationIssues.filter((i) => i.severity === 'warning')
                    .length > 0 && (
                    <span>
                      {
                        validationIssues.filter((i) => i.severity === 'warning')
                          .length
                      }{' '}
                      {validationIssues.filter((i) => i.severity === 'warning')
                        .length === 1
                        ? 'warning'
                        : 'warnings'}
                    </span>
                  )}
                </h3>
                {fixedIssuesCount > 0 && (
                  <button
                    onClick={() => setShowIssues(!showIssues)}
                    className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  >
                    {showIssues ? (
                      <>
                        <span>Hide details</span>
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <span>Show details</span>
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
              {showIssues && (
                <div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-400">
                  {appliedFixes.length > 0 && (
                    <>
                      <div className="font-medium">Fixed:</div>
                      {appliedFixes.map((fix, index) => (
                        <div key={index}>• {fix}</div>
                      ))}
                    </>
                  )}
                  {validationIssues.filter((i) => i.severity === 'warning')
                    .length > 0 && (
                    <>
                      <div className="mt-2 font-medium">
                        Warnings (non-critical):
                      </div>
                      {validationIssues
                        .filter((i) => i.severity === 'warning')
                        .map((issue, index) => (
                          <div key={index}>• {issue.message}</div>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remaining validation errors (only show errors, not warnings) */}
      {validationIssues.filter((i) => i.severity === 'error').length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-500" />
            <div className="flex-1">
              <h3 className="mb-2 font-medium text-red-900 dark:text-red-300">
                Issues Requiring Attention
              </h3>
              <div className="space-y-1">
                {validationIssues
                  .filter((i) => i.severity === 'error')
                  .map((issue, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-red-700 dark:text-red-400">
                        • {issue.message}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation in progress */}
      {(validating || autoFixing) && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700 dark:text-blue-400">
              {autoFixing
                ? 'Auto-fixing configuration issues...'
                : 'Validating configuration...'}
            </span>
          </div>
        </div>
      )}

      {/* Color Legend */}
      <div className="mb-4 flex flex-wrap gap-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-blue-600" />
          <span>Core (Required)</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-sky-500" />
          <span>Optional Services</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-orange-600" />
          <span>Custom Services</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-teal-600" />
          <span>Frontend Apps</span>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-4">
        {/* Project Details */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
            Project Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Name:</span>
              <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                {config.projectName}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">
                Environment:
              </span>
              <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                {config.environment}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Domain:</span>
              <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                {config.domain}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">
                Database:
              </span>
              <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                {config.databaseName}
              </span>
            </div>
          </div>
        </div>

        {/* Services Summary */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
            Services Configuration
          </h3>

          <div className="space-y-3">
            {/* Core Services - Always Enabled */}
            <div>
              <h4 className="mb-2 text-xs font-medium tracking-wider text-zinc-600 uppercase dark:text-zinc-400">
                Core Services (Always Enabled)
              </h4>
              <div className="ml-2 space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-zinc-900 dark:text-white">
                    PostgreSQL Database
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-zinc-900 dark:text-white">
                    Hasura GraphQL Engine
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-zinc-900 dark:text-white">
                    Authentication Service
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-zinc-900 dark:text-white">
                    Nginx Reverse Proxy
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Services - If Enabled */}
            {enabledOptionalServices.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium tracking-wider text-zinc-600 uppercase dark:text-zinc-400">
                  Optional Services
                </h4>
                <div className="ml-2 space-y-2 text-sm">
                  {enabledOptionalServices.map((service) => (
                    <div
                      key={String(service)}
                      className="flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4 text-sky-500" />
                      <span className="text-zinc-900 dark:text-white">
                        {service}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Services */}
        {config.customServices.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
              Custom Services ({config.customServices.length})
            </h3>
            <div className="space-y-2 text-sm">
              {config.customServices.map((service, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-orange-600" />
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-zinc-900 dark:text-white">
                      {service.name}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {service.framework} • Port {service.port}
                      {service.route && ` • ${service.route}.${config.domain}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Frontend Apps */}
        {config.frontendApps.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
              Frontend Applications ({config.frontendApps.length})
            </h3>
            <div className="space-y-2 text-sm">
              {config.frontendApps.map((app, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-zinc-900 dark:text-white">
                      {app.displayName || `App ${index + 1}`}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {app.productionUrl &&
                        `${app.productionUrl}.${config.domain} • `}
                      {app.localPort
                        ? `Port ${app.localPort}`
                        : 'No port configured'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Summary */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-blue-900 dark:text-blue-200">
              Total Services to Build
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalServices}
            </span>
          </div>
          <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
            <div className="flex justify-between">
              <span>Core Services:</span>
              <span className="font-medium">{coreServicesCount}</span>
            </div>
            {optionalServicesCount > 0 && (
              <div className="flex justify-between">
                <span>Optional Services:</span>
                <span className="font-medium">{optionalServicesCount}</span>
              </div>
            )}
            {config.customServices.length > 0 && (
              <div className="flex justify-between">
                <span>Custom Services:</span>
                <span className="font-medium">
                  {config.customServices.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleBuild}
          disabled={
            loading ||
            validating ||
            validationIssues.some((i) => i.severity === 'error')
          }
          className="inline-flex cursor-pointer items-center justify-center gap-0.5 overflow-hidden rounded-full bg-green-600 px-3 py-1 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500/10 dark:text-green-400 dark:ring-1 dark:ring-green-400/20 dark:ring-inset dark:hover:bg-green-400/10 dark:hover:text-green-300 dark:hover:ring-green-300"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white dark:border-green-400"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Hammer className="h-4 w-4" />
              <span>Build Project</span>
            </>
          )}
        </button>
      </div>
    </StepWrapper>
  )
}
