/**
 * Purpose: Wizard lifecycle — load state on mount (per `mode`), autosave on
 *          config/step change, poll project status, and the Next/Back/
 *          ClearState/Build handlers. Extracted verbatim from
 *          ProjectSetupWizard.tsx (ex-lines 1010-1278 of the 3670-line
 *          monolith). Takes the config-state hook's return value as an
 *          argument instead of calling useWizardConfigState() itself — same
 *          effective behavior, just composed as siblings, not nested.
 * Inputs: mode ('new' | 'edit' | 'reset'), the WizardConfigState object.
 * Outputs: saveState, handleNext, handleBack, clearWizardState, handleBuild.
 * Constraints: The 3 useEffects' dep arrays are copied verbatim — don't
 *              simplify without re-checking original trigger conditions. */
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/stores/projectStore'
import type { WizardConfigState } from './useWizardConfigState'

export function useWizardPersistence(mode: 'new' | 'edit' | 'reset', state: WizardConfigState) {
  const router = useRouter()
  const { projectStatus, checkProjectStatus, setProjectSetup } = useProjectStore()
  const {
    config, setConfig, currentStep, setCurrentStep, steps, currentStepIndex,
    isLoading, setIsLoading, setIsExecuting, setCommandOutput,
    setDomainPreview, setValidationErrors, validateInitialSetup,
  } = state

  const saveState = useCallback(async () => {
    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      // Update .env.local file with current config
      await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ config, step: currentStep }),
      })
    } catch (error) {
      console.error('Failed to save to .env.local:', error)
    }
  }, [config, currentStep])

  // Load config from .env.local file (or init if doesn't exist)
  useEffect(() => {
    const loadState = async () => {
      try {
        const csrfToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('nself-csrf='))
          ?.split('=')[1]

        if (mode === 'reset') {
          // Reset mode - run nself reset first, then init fresh
          const resetResponse = await fetch('/api/nself/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken || '',
            },
            body: JSON.stringify({ mode: 'reset' }),
          })

          if (resetResponse.ok) {
            // Now run init to create fresh .env.local
            const initResponse = await fetch('/api/wizard/init')
            const initData = await initResponse.json()

            if (initData.success && initData.config) {
              setConfig(initData.config)
              setDomainPreview(`https://admin.${initData.config.domain || 'localhost'}`)
              setCurrentStep('initial')
            }
          }
        } else if (mode === 'edit') {
          // Edit mode - run nself reset but preserve .env.local
          const resetResponse = await fetch('/api/nself/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken || '',
            },
            body: JSON.stringify({ mode: 'edit' }),
          })

          if (resetResponse.ok) {
            const resetData = await resetResponse.json()
            if (resetData.config) {
              // Use config from preserved .env.local
              setConfig(resetData.config)
              setDomainPreview(`https://admin.${resetData.config.domain || 'localhost'}`)
              // Jump to review step since we're editing
              setCurrentStep('review')
            }
          }
        } else {
          // New mode - check if .env.local exists, if not run nself init
          const initResponse = await fetch('/api/wizard/init')
          const initData = await initResponse.json()

          if (initData.success && initData.config) {
            setConfig(initData.config)
            setDomainPreview(`https://admin.${initData.config.domain || 'localhost'}`)
            setCurrentStep('initial')
          }
        }
      } catch (error) {
        console.error('Failed to load state:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadState()
    checkProjectStatus()
    // The setState setters used above are stable (useWizardConfigState's
    // useState) but now cross a hook boundary the linter can't see through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkProjectStatus, mode])

  // Save state whenever config or step changes
  useEffect(() => {
    if (!isLoading) {
      saveState()
    }
  }, [config, currentStep, isLoading, saveState])

  useEffect(() => {
    if (projectStatus === 'running') {
      setTimeout(() => {
        setProjectSetup(true)
      }, 2000)
    }
  }, [projectStatus, setProjectSetup])

  const handleNext = () => {
    if (currentStep === 'initial') {
      if (!validateInitialSetup()) {
        return
      }
    }

    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1]
      if (nextStep) setCurrentStep(nextStep)
      setValidationErrors({})
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1]
      if (prevStep) setCurrentStep(prevStep)
    }
  }

  const clearWizardState = async () => {
    try {
      await fetch('/api/wizard/state', {
        method: 'DELETE',
      })
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear wizard state:', error)
    }
  }

  const handleBuild = async () => {
    try {
      setIsExecuting(true)
      setCommandOutput('Initializing project...')

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      // Convert config to env format
      const envData: Record<string, any> = {
        PROJECT_NAME: config.projectName,
        ENV: config.environment,
        BASE_DOMAIN: config.domain,
        ADMIN_EMAIL: config.adminEmail,
        POSTGRES_DB: config.databaseName,
        POSTGRES_PASSWORD: config.databasePassword,
        HASURA_GRAPHQL_ADMIN_SECRET: config.hasuraAdminSecret,
        HASURA_JWT_KEY: config.jwtSecret,
        BACKUP_ENABLED: config.backupEnabled,
        BACKUP_SCHEDULE: config.backupSchedule,
        // Required services
        POSTGRES_VERSION: config.postgres.version,
        POSTGRES_PORT: config.postgres.port,
        DB_MAX_CONNECTIONS: config.postgres.maxConnections,
        DB_POOLER_ENABLED: config.postgres.poolingEnabled,
        HASURA_VERSION: config.hasura.version,
        HASURA_GRAPHQL_ENABLE_CONSOLE: config.hasura.consoleEnabled,
        HASURA_GRAPHQL_DEV_MODE: config.hasura.devMode,
        HASURA_GRAPHQL_CORS_DOMAIN: config.hasura.cors,
        SSL_MODE: config.nginx.sslMode,
        NGINX_HTTP_PORT: config.nginx.httpPort,
        NGINX_HTTPS_PORT: config.nginx.httpsPort,
        AUTH_JWT_ACCESS_TOKEN_EXPIRES_IN: config.auth.jwtExpiresIn,
        AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN: config.auth.refreshExpiresIn,
        AUTH_SMTP_HOST: config.auth.smtpHost,
        AUTH_SMTP_PORT: config.auth.smtpPort,
        AUTH_SMTP_SENDER: config.auth.smtpSender,
        S3_ACCESS_KEY: config.storage.accessKey,
        S3_SECRET_KEY: config.storage.secretKey,
        S3_BUCKET: config.storage.bucket,
        S3_REGION: config.storage.region,
        // Optional services
        REDIS_ENABLED: config.optionalServices.redis,
        MAILPIT_ENABLED:
          config.optionalServices.mail.enabled &&
          config.optionalServices.mail.provider === 'mailpit',
        MONITORING_ENABLED: config.optionalServices.monitoring,
        SEARCH_ENABLED: config.optionalServices.search.enabled,
        MLFLOW_ENABLED: config.optionalServices.mlflow,
        ADMIN_ENABLED: config.optionalServices.adminUI,
      }

      // Add user services
      config.customServices.forEach((service, index) => {
        envData[`CS_${index + 1}`] = `${service.name},${service.framework}`
        envData[`CS_${index + 1}_PORT`] = service.port
        envData[`CS_${index + 1}_ROUTE`] = service.route
      })

      // Add frontend apps
      if (config.frontendApps.length > 0) {
        envData['FRONTEND_APPS'] = config.frontendApps
          .filter((app) => app.enabled)
          .map(
            (app) =>
              `${app.name}:${app.displayName}:${app.tablePrefix}:${app.port}:${app.subdomain}`
          )
          .join(',')

        // Generate nginx routing config for dev environment
        if (config.environment === 'dev') {
          envData['NGINX_FRONTEND_ROUTES'] = config.frontendApps
            .filter((app) => app.enabled && app.deployment === 'local')
            .map((app) => `${app.subdomain}.${config.domain}:localhost:${app.port}`)
            .join(',')
        }
      }

      // Make sure .env.local is fully updated with final config
      await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ config, step: 'review' }),
      })

      setCommandOutput('Building project with nself build...')

      // Call nself build which reads from .env.local
      const buildResponse = await fetch('/api/nself/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
      })

      if (!buildResponse.ok) {
        throw new Error('Failed to build project')
      }

      setCommandOutput('Project built successfully!')

      // Clear wizard state after successful build
      await fetch('/api/wizard/state', {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken || '',
        },
      })

      // Redirect to start page after build using Next.js router
      setTimeout(() => {
        router.push('/start')
      }, 2000)
    } catch (error) {
      console.error('Build failed:', error)
      setCommandOutput(`Build failed: ${error}`)
      setIsExecuting(false)
    }
  }

  return { saveState, handleNext, handleBack, clearWizardState, handleBuild }
}
