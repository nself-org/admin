/**
 * Purpose: All wizard CONFIG state (the ProjectConfig being built, its
 *          validation errors, per-step UI toggle flags, auto-focus refs)
 *          plus the pure validateDomain/validateInitialSetup functions —
 *          extracted verbatim from ProjectSetupWizard.tsx (P6-E11-W2-S3-T17
 *          split; this used to be lines 802-1008 of the 3670-line monolith).
 * Inputs: none (mode-independent — mode only affects the OTHER hook,
 *         useWizardPersistence, which decides how to populate this state
 *         on load).
 * Outputs: every config-related state value/setter + validateDomain +
 *          validateInitialSetup, consumed by both ProjectSetupWizard.tsx
 *          (for the step dispatcher props) and useWizardPersistence.ts
 *          (which needs setConfig/setValidationErrors/config/currentStep
 *          etc. — passed in as an argument, not re-derived).
 * Constraints: This hook holds NO side effects (no fetch, no router) — see
 *              useWizardPersistence.ts for load/save/build. Splitting it
 *              this way (state vs. lifecycle) keeps each file under the
 *              300-line cap without changing when any state actually updates.
 */
import { useRef, useState } from 'react'
import type { ProjectConfig, ValidationErrors, WizardStep } from './types'

export function useWizardConfigState() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('initial')
  const [isExecuting, setIsExecuting] = useState(false)
  const [commandOutput, setCommandOutput] = useState('')
  const [showCliInstructions, setShowCliInstructions] = useState(false)
  const [domainPreview, setDomainPreview] = useState('https://admin.localhost')
  const [showPassword, setShowPassword] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [showTemplateInfo, setShowTemplateInfo] = useState(false)
  const [showFrameworkExamples, setShowFrameworkExamples] = useState(false)
  const [showWhyRegister, setShowWhyRegister] = useState(false)

  // Refs for auto-focus
  const serviceNameRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const appNameRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  const [config, setConfig] = useState<ProjectConfig>({
    // Initial Setup
    projectName: 'my_project',
    environment: 'dev',
    domain: 'localhost',
    adminEmail: '',
    databaseName: 'my_database',
    databasePassword: 'postgres_dev_password',
    hasuraAdminSecret: 'hasura-admin-secret-dev',
    jwtSecret: 'development-secret-key-minimum-32-characters-long',
    backupEnabled: false,
    backupSchedule: '0 2 * * *',

    // Required Services Configuration
    postgres: {
      version: '16-alpine',
      port: 5432,
      maxConnections: 100,
      poolingEnabled: 'auto',
    },
    hasura: {
      version: 'v2.44.0',
      consoleEnabled: true,
      devMode: true,
      cors: '*',
    },
    nginx: {
      sslMode: 'local',
      httpPort: 80,
      httpsPort: 443,
    },
    auth: {
      jwtExpiresIn: 900,
      refreshExpiresIn: 2592000,
      smtpHost: 'mailpit',
      smtpPort: 1025,
      smtpSender: 'noreply@localhost',
    },
    storage: {
      accessKey: 'storage-access-key-dev',
      secretKey: 'storage-secret-key-dev',
      bucket: 'nself',
      region: 'us-east-1',
    },

    // Optional Services
    optionalServices: {
      redis: false,
      mail: {
        enabled: false,
        provider: 'auto', // Auto selects best option based on environment
      },
      monitoring: false,
      search: {
        enabled: false,
        provider: 'auto', // Auto selects best option based on environment
      },
      mlflow: false,
      adminUI: true, // Always enabled since we're using it
    },

    // User Services
    customServices: [],

    // Frontend Apps
    frontendApps: [],

    // Optional Services Configuration (initialized with defaults)
    redisConfig: {
      port: 6379,
      version: '7-alpine',
      maxMemory: '256mb',
    },
    mailConfig: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      smtpSecure: true,
      fromEmail: '',
    },
    monitoringConfig: {
      grafanaPort: 3000,
      prometheusPort: 9090,
      lokiPort: 3100,
      jaegerPort: 16686,
    },
    searchConfig: {
      port: 7700,
      apiKey: '',
    },
    mlflowConfig: {
      trackingPort: 5000,
      artifactRoot: '/mlflow/artifacts',
    },
    nadminConfig: {
      port: 3021,
      sessionTimeout: 1440,
      enableMetrics: true,
      enableBackups: true,
    },
  })

  const steps: WizardStep[] = [
    'initial',
    'required-services',
    'optional-services',
    'user-services',
    'apps',
    'review',
  ]
  const currentStepIndex = steps.indexOf(currentStep)

  // Domain validation function
  const validateDomain = (domain: string, environment: string): string | null => {
    if (!domain) {
      return 'Domain is required'
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase()

    if (environment === 'dev') {
      const devPatterns = [
        /^localhost$/,
        /^127\.0\.0\.1$/,
        /^0\.0\.0\.0$/,
        /^192\.168\.\d{1,3}\.\d{1,3}$/,
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
        /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
        /\.local$/,
        /\.localhost$/,
        /^local\.nself\.org$/,
        /\.test$/,
        /\.dev$/,
      ]

      const isValidDev = devPatterns.some((pattern) => pattern.test(cleanDomain))
      if (!isValidDev) {
        return 'For development, use localhost, *.local, local.nself.org, or a local IP address'
      }
    } else {
      const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/

      if (!domainPattern.test(cleanDomain)) {
        return 'Must be a valid domain (e.g., example.com, app.example.com)'
      }

      const invalidTLDs = ['.local', '.localhost', '.test', '.dev', '.internal']
      if (invalidTLDs.some((tld) => cleanDomain.endsWith(tld))) {
        return `${environment === 'staging' ? 'Staging' : 'Production'} requires a real domain with valid TLD (e.g., .com, .org, .io)`
      }

      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanDomain)) {
        return 'IP addresses are not recommended for production. Please use a domain name.'
      }
    }

    return null
  }

  // Validate all initial setup fields
  const validateInitialSetup = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!config.projectName) {
      errors.projectName = 'Project name is required'
    } else if (!/^[a-z0-9_-]+$/.test(config.projectName)) {
      errors.projectName = 'Only lowercase letters, numbers, hyphens, and underscores allowed'
    }

    const domainError = validateDomain(config.domain, config.environment)
    if (domainError) {
      errors.domain = domainError
    }

    if (!config.databaseName) {
      errors.databaseName = 'Database name is required'
    } else if (!/^[a-z0-9_]+$/.test(config.databaseName)) {
      errors.databaseName = 'Only lowercase letters, numbers, and underscores allowed'
    }

    if (config.environment === 'prod' && config.databasePassword.length < 12) {
      errors.databasePassword = 'Production requires a strong password (12+ characters)'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  return {
    currentStep,
    setCurrentStep,
    isExecuting,
    setIsExecuting,
    commandOutput,
    setCommandOutput,
    showCliInstructions,
    setShowCliInstructions,
    domainPreview,
    setDomainPreview,
    showPassword,
    setShowPassword,
    isLoading,
    setIsLoading,
    validationErrors,
    setValidationErrors,
    selectedService,
    setSelectedService,
    showTemplateInfo,
    setShowTemplateInfo,
    showFrameworkExamples,
    setShowFrameworkExamples,
    showWhyRegister,
    setShowWhyRegister,
    serviceNameRefs,
    appNameRefs,
    config,
    setConfig,
    steps,
    currentStepIndex,
    validateDomain,
    validateInitialSetup,
  }
}

export type WizardConfigState = ReturnType<typeof useWizardConfigState>
