'use client'

import ServiceConfigModal from '@/components/ServiceConfigModal'
import { useWizardStore } from '@/stores/wizardStore'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Database,
  HardDrive,
  Mail,
  Package,
  Search,
  Wrench,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { StepWrapper } from '../StepWrapper'

export default function InitStep3() {
  const router = useRouter()
  const [modalService, setModalService] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)

  // Use wizard store
  const {
    optionalServices,
    setOptionalServices,
    syncWithEnv,
    isInitialized,
    isLoading,
    environment,
  } = useWizardStore()

  const [serviceConfigs, setServiceConfigs] = useState<Record<string, any>>({
    redis: {},
    minio: {},
    monitoring: {},
    mlflow: {},
    mailpit: {},
    elasticsearch: {},
    functions: {},
  })

  // Always sync with env when component mounts to get latest values
  useEffect(() => {
    syncWithEnv()

    // Reload when the page gains focus (e.g., navigating back)
    const handleFocus = () => {
      syncWithEnv()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncWithEnv()
      }
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [syncWithEnv])

  const handleNext = () => {
    // Changes are already saved, just navigate
    setNavigating(true)
    router.push('/init/4')
  }

  const handleBack = () => {
    router.push('/init/2')
  }

  const handleConfigure = (service: string) => {
    setModalService(service)
  }

  const handleSaveConfig = async (service: string, serviceConfig: any) => {
    setServiceConfigs((prev) => ({
      ...prev,
      [service]: serviceConfig,
    }))

    // Save configuration to .env.{environment} immediately (team settings)
    const variables = Object.entries(serviceConfig).map(([key, value]) => ({
      key,
      value: String(value),
    }))

    if (variables.length > 0) {
      try {
        await fetch('/api/wizard/update-env-var', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variables,
            environment: environment || 'dev',
          }),
        })
      } catch (error) {
        console.error('Failed to save service configuration:', error)
      }
    }
  }

  const toggleService = async (serviceKey: string) => {
    // Map service keys to wizard store keys
    const keyMap: Record<string, string> = {
      redisEnabled: 'redis',
      minioEnabled: 'minio',
      mlflowEnabled: 'mlflow',
      mailpitEnabled: 'mailpit',
      searchEnabled: 'search',
      monitoringEnabled: 'monitoring',
      nadminEnabled: 'nadmin',
      functionsEnabled: 'functions',
    }

    const storeKey = keyMap[serviceKey] as keyof typeof optionalServices
    if (!storeKey) return

    // Update wizard store
    const newOptionalServices = {
      ...optionalServices,
      [storeKey]: !optionalServices[storeKey],
    }

    setOptionalServices(newOptionalServices)

    // Save to env file
    try {
      // Get the environment from localStorage (set in step 1)
      const environment = localStorage.getItem('wizard_environment') || 'dev'

      await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            environment, // Include environment to write to correct file
            optionalServices: newOptionalServices,
          },
          step: 'optional-services',
        }),
      })
    } catch (error) {
      console.error('Failed to save service state:', error)
    }
  }

  // Calculate toggle states based on wizard store
  const allEnabled = Object.values(optionalServices)
    .filter(
      (v, i) =>
        // Exclude nadmin from "all" calculation since it's always required
        Object.keys(optionalServices)[i] !== 'nadmin',
    )
    .every((v) => v === true)

  const noneEnabled = Object.values(optionalServices)
    .filter(
      (v, i) =>
        // Exclude nadmin from "all" calculation since it's always required
        Object.keys(optionalServices)[i] !== 'nadmin',
    )
    .every((v) => v === false)

  const toggleAll = async () => {
    const newState = !allEnabled
    // Don't include nadmin in the toggle since it's required
    const newOptionalServices = {
      ...optionalServices,
      redis: newState,
      minio: newState,
      mlflow: newState,
      mailpit: newState,
      search: newState,
      monitoring: newState,
      functions: newState,
      // nadmin stays as is
    }

    setOptionalServices(newOptionalServices)

    // Save to env file
    try {
      // Get the environment from localStorage (set in step 1)
      const environment = localStorage.getItem('wizard_environment') || 'dev'

      await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            environment, // Include environment to write to correct file
            optionalServices: newOptionalServices,
          },
          step: 'optional-services',
        }),
      })
    } catch (error) {
      console.error('Failed to save service state:', error)
    }
  }

  const serviceDefinitions: Array<{
    key: string
    configKey: string
    name: string
    icon: any
    description: string
    details: string
    enabled: boolean
    required?: boolean
    hasConfiguration?: boolean
  }> = [
    {
      key: 'nadminEnabled',
      configKey: 'nadmin',
      name: 'nself-admin',
      icon: Wrench,
      description: 'Web-based administration dashboard (Required)',
      details:
        'Currently running! This dashboard provides complete control over your nself project including service management, database tools, monitoring, and configuration. Essential for project administration.',
      enabled: true,
      required: true,
      hasConfiguration: false,
    },
    {
      key: 'redisEnabled',
      configKey: 'redis',
      name: 'Redis',
      icon: Database,
      description: 'In-memory data store for caching and real-time features',
      details:
        'Lightning-fast key-value database. Use for session storage, caching, pub/sub messaging, real-time leaderboards, rate limiting, and distributed locks.',
      enabled: optionalServices.redis || false,
    },
    {
      key: 'minioEnabled',
      configKey: 'minio',
      name: 'MinIO',
      icon: HardDrive,
      description: 'S3-compatible object storage for files and media',
      details:
        'Self-hosted AWS S3 alternative. Perfect for storing user uploads, profile images, documents, backups, and any binary data with full S3 API compatibility and multi-cloud support.',
      enabled: optionalServices.minio || false,
    },
    {
      key: 'functionsEnabled',
      configKey: 'functions',
      name: 'Functions',
      icon: Zap,
      description: 'Serverless functions for custom backend logic',
      details:
        'Based on Nhost serverless functions. Execute custom TypeScript/JavaScript code in response to events, webhooks, or API calls. Perfect for business logic, data processing, integrations, and custom endpoints without managing servers.',
      enabled: optionalServices.functions || false,
    },
    {
      key: 'mailpitEnabled',
      configKey: 'mailpit',
      name: 'Mail Service',
      icon: Mail,
      description: 'Email testing and delivery service',
      details:
        "Catch all emails in development with Mailpit's web UI. Configure production email with SendGrid, AWS SES, Resend, Postmark, or your own SMTP service. Auto mode uses Mailpit for dev and your selected service for production.",
      enabled: optionalServices.mailpit || false,
    },
    {
      key: 'searchEnabled',
      configKey: 'search',
      name: 'Search Services',
      icon: Search,
      description: 'Full-text search with 6 engine options',
      details:
        'Choose from Meilisearch (default), Typesense, Zinc, Elasticsearch, OpenSearch, or Sonic. Each offers different trade-offs between features, performance, and resource usage.',
      enabled: optionalServices.search || false,
    },
    {
      key: 'mlflowEnabled',
      configKey: 'mlflow',
      name: 'MLflow',
      icon: Package,
      description: 'Machine Learning lifecycle management platform',
      details:
        'Complete ML platform for experiment tracking, model registry, model deployment, and collaborative ML workflows. Integrates with popular ML frameworks and provides a unified interface for the entire ML lifecycle.',
      enabled: optionalServices.mlflow || false,
    },
    {
      key: 'monitoringEnabled',
      configKey: 'monitoring',
      name: 'Monitoring Bundle',
      icon: Activity,
      description: 'Complete observability stack with 8 integrated services',
      details:
        'Includes Prometheus (metrics collection), Grafana (visualization dashboards), Loki (log aggregation), Tempo (distributed tracing), Alertmanager (alert routing), plus Node Exporter, Postgres Exporter, and cAdvisor for comprehensive system monitoring. Full observability for your entire stack.',
      enabled: optionalServices.monitoring || false,
    },
  ]

  // Show loading skeleton while initial data loads
  if (isLoading && !isInitialized) {
    return (
      <StepWrapper>
        <div className="space-y-4">
          {/* Loading skeleton for service cards */}
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border-2 border-zinc-200 p-5 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div>
                    <div className="mb-2 h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                    <div className="h-3 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-11 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
                  <div className="h-8 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </StepWrapper>
    )
  }

  return (
    <StepWrapper>
      {/* Subtle toggle all button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={toggleAll}
          className="text-xs text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
        >
          {allEnabled
            ? 'Disable All'
            : noneEnabled
              ? 'Enable All'
              : 'Toggle All'}
        </button>
      </div>

      <div className="space-y-4">
        {serviceDefinitions.map((service) => {
          const Icon = service.icon
          return (
            <div
              key={service.key}
              className={`relative rounded-lg border-2 p-5 transition-all ${
                service.enabled
                  ? 'border-sky-500/40 bg-sky-50/40 dark:bg-sky-900/10'
                  : 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex flex-1 items-start space-x-4 ${service.required ? '' : 'cursor-pointer'}`}
                  onClick={() =>
                    !service.required &&
                    !service.enabled &&
                    toggleService(service.key)
                  }
                >
                  <div
                    className={`rounded-lg border p-2 ${
                      service.enabled
                        ? 'border-sky-300 bg-white dark:border-sky-800 dark:bg-zinc-800'
                        : 'border-zinc-200 bg-white hover:border-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-800'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        service.enabled
                          ? 'text-sky-500 dark:text-sky-400'
                          : 'text-zinc-600 hover:text-sky-500 dark:text-zinc-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`mb-1 font-medium ${
                        service.enabled
                          ? 'text-sky-900 dark:text-sky-100'
                          : 'text-zinc-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-300'
                      }`}
                    >
                      {service.name}
                    </h3>
                    <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {service.description}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      {service.details}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex flex-col items-end space-y-2">
                  {/* Checkbox */}
                  <label
                    className={`relative inline-flex items-center ${service.required ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={service.enabled}
                      onChange={() =>
                        !service.required && toggleService(service.key)
                      }
                      disabled={service.required}
                      className={`h-5 w-5 rounded border-2 focus:ring-2 ${
                        service.enabled
                          ? 'text-sky-500 focus:ring-sky-400'
                          : 'border-zinc-300 text-sky-500 hover:border-sky-400 dark:border-zinc-600 dark:hover:border-sky-500'
                      } ${service.required ? 'cursor-not-allowed opacity-50' : ''}`}
                      style={{
                        accentColor: service.enabled ? '#9333ea' : undefined,
                      }}
                    />
                  </label>

                  {/* Configure link (only shown when enabled and has configuration) */}
                  {service.enabled && (
                    <button
                      onClick={() =>
                        service.hasConfiguration !== false
                          ? handleConfigure(service.configKey)
                          : null
                      }
                      disabled={service.hasConfiguration === false}
                      className={`inline-flex items-center gap-1 text-xs transition-colors ${
                        service.hasConfiguration === false
                          ? 'cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                          : 'cursor-pointer text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300'
                      }`}
                      title={
                        service.hasConfiguration === false
                          ? 'No configuration options available'
                          : 'Configure service'
                      }
                    >
                      <Wrench className="h-3 w-3" />
                      <span>Configure</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleNext}
          disabled={navigating}
          className="inline-flex cursor-pointer items-center justify-center gap-0.5 overflow-hidden rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-1 dark:ring-blue-400/20 dark:ring-inset dark:hover:bg-blue-400/10 dark:hover:text-blue-300 dark:hover:ring-blue-300"
        >
          {navigating ? (
            <>
              <span>Loading</span>
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white dark:border-blue-400"></div>
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Configuration Modal */}
      {modalService && (
        <ServiceConfigModal
          isOpen={!!modalService}
          onClose={() => setModalService(null)}
          service={modalService}
          config={serviceConfigs[modalService]}
          onSave={(serviceConfig) =>
            handleSaveConfig(modalService, serviceConfig)
          }
        />
      )}
    </StepWrapper>
  )
}
