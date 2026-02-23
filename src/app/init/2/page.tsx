'use client'

import ServiceConfigModal from '@/components/ServiceConfigModal'
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Globe,
  Server,
  Shield,
  Wrench,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { StepWrapper } from '../StepWrapper'

export default function InitStep2() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [modalService, setModalService] = useState<string | null>(null)
  const [initialConfig, setInitialConfig] = useState<Record<string, unknown>>({})
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, any>>({
    postgresql: {},
    hasura: {},
    auth: {},
    nginx: {},
  })

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
  }, [router])

  // Load configuration from .env.local on mount
  useEffect(() => {
    checkAndLoadConfiguration()
  }, [checkAndLoadConfiguration])

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/wizard/init')
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          // Store initial config from step 1
          setInitialConfig({
            databaseName: data.config.databaseName,
            databasePassword: data.config.databasePassword,
            environment: data.config.environment,
            adminEmail: data.config.adminEmail,
          })
          // Load any existing service configs
          setServiceConfigs((prev) => ({
            ...prev,
            postgresql: data.config.postgresqlConfig || {},
            hasura: data.config.hasuraConfig || {},
            auth: data.config.authConfig || {},
            nginx: data.config.nginxConfig || {},
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
    } finally {
      setDataLoaded(true)
    }
  }

  const handleNext = async () => {
    setLoading(true)
    try {
      // Get the environment from localStorage (set in step 1)
      const environment = localStorage.getItem('wizard_environment') || 'dev'

      // Save service configurations to .env.local
      const response = await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            environment, // Include environment to write to correct file
            postgresqlEnabled: true,
            hasuraEnabled: true,
            authEnabled: true,
            nginxEnabled: true,
            postgresqlConfig: serviceConfigs.postgresql,
            hasuraConfig: serviceConfigs.hasura,
            authConfig: serviceConfigs.auth,
            nginxConfig: serviceConfigs.nginx,
          },
          step: 'required',
        }),
      })

      if (response.ok) {
        // Don't set loading to false - let the page transition handle it
        router.push('/init/3')
      } else {
        console.error('Failed to save configuration')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      // Only set loading false on error
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/init/1')
  }

  const handleConfigure = (service: string) => {
    setModalService(service)
  }

  const handleSaveConfig = async (service: string, config: any) => {
    // Save to local state
    setServiceConfigs((prev) => ({
      ...prev,
      [service]: config,
    }))

    // Save to env file immediately for all service configurations
    try {
      // Get the environment from localStorage (set in step 1)
      const environment = localStorage.getItem('wizard_environment') || 'dev'

      const updateConfig: any = {
        environment, // Always include environment
      }

      // Map service to appropriate config key
      switch (service) {
        case 'postgresql':
          updateConfig.postgresqlConfig = config
          break
        case 'hasura':
          updateConfig.hasuraConfig = config
          break
        case 'auth':
          updateConfig.authConfig = config
          break
        case 'nginx':
          updateConfig.nginxConfig = config
          break
      }

      const response = await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: updateConfig,
          step: 'required',
        }),
      })

      if (!response.ok) {
        console.error(`Failed to save ${service} configuration`)
      }
    } catch (error) {
      console.error(`Error saving ${service} configuration:`, error)
    }
  }

  const requiredServices = [
    {
      key: 'postgresql',
      name: 'PostgreSQL',
      icon: Database,
      description: 'Primary database for all services',
      configurable: true,
    },
    {
      key: 'hasura',
      name: 'Hasura GraphQL',
      icon: Server,
      description: 'Instant GraphQL API for your database',
      configurable: true,
    },
    {
      key: 'auth',
      name: 'Hasura Auth',
      icon: Shield,
      description: 'User authentication and authorization',
      configurable: true,
    },
    {
      key: 'nginx',
      name: 'Nginx',
      icon: Globe,
      description: 'Reverse proxy and load balancer',
      configurable: true,
    },
  ]

  // Show loading skeleton while initial data loads
  if (!dataLoaded) {
    return (
      <StepWrapper>
        <div className="space-y-4">
          {/* Loading skeleton for service cards */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border-2 border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div>
                    <div className="mb-2 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                    <div className="h-3 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"></div>
                  </div>
                </div>
                <div className="h-8 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
              </div>
            </div>
          ))}
        </div>
      </StepWrapper>
    )
  }

  return (
    <StepWrapper>
      <div className="space-y-4">
        {requiredServices.map((service) => {
          const Icon = service.icon
          return (
            <div
              key={service.key}
              className="flex items-center justify-between rounded-lg border-2 border-blue-500/30 bg-blue-50/50 p-4 dark:bg-blue-900/10"
            >
              <div className="flex items-center space-x-4">
                <div className="rounded-lg border border-blue-200 bg-white p-2 dark:border-blue-800 dark:bg-zinc-800">
                  <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">
                    {service.name}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {service.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-600">
                  Required
                </span>
                {service.configurable && (
                  <button
                    onClick={() => handleConfigure(service.key)}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Wrench className="h-3 w-3" />
                    <span className="cursor-pointer">Configure</span>
                  </button>
                )}
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
          disabled={loading}
          className="inline-flex cursor-pointer items-center justify-center gap-0.5 overflow-hidden rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-1 dark:ring-blue-400/20 dark:ring-inset dark:hover:bg-blue-400/10 dark:hover:text-blue-300 dark:hover:ring-blue-300"
        >
          {loading ? (
            <>
              <span>Saving</span>
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
          onSave={(config) => handleSaveConfig(modalService, config)}
          initialConfig={initialConfig}
        />
      )}
    </StepWrapper>
  )
}
