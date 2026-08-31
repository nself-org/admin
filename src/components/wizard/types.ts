/**
 * Purpose: Shared type definitions for the Project Setup Wizard's config shape.
 *          Extracted verbatim from the original monolithic
 *          ProjectSetupWizard.tsx so every step module and the orchestrator
 *          share one source of truth for the wizard's state.
 * Inputs: None (pure type declarations).
 * Outputs: `WizardStep` union, `ProjectConfig` interface, `ValidationErrors` map.
 * Constraints: Field shapes (keys, literal unions) must match exactly what the
 *              CLI env mapping (`handleBuild` in ProjectSetupWizard.tsx) expects —
 *              do not rename or reorder keys without updating that mapping too.
 */

export type WizardStep =
  | 'initial'
  | 'required-services'
  | 'optional-services'
  | 'user-services'
  | 'apps'
  | 'review'

export interface ProjectConfig {
  // Initial Setup
  projectName: string
  environment: 'dev' | 'staging' | 'prod'
  domain: string
  adminEmail: string
  databaseName: string
  databasePassword: string
  hasuraAdminSecret: string
  jwtSecret: string
  backupEnabled: boolean
  backupSchedule: string

  // Required Services Configuration
  postgres: {
    version: string
    port: number
    maxConnections: number
    poolingEnabled: 'auto' | 'true' | 'false'
    [key: string]: any
  }
  hasura: {
    version: string
    consoleEnabled: boolean
    devMode: boolean
    cors: string
    [key: string]: any
  }
  nginx: {
    sslMode: 'local' | 'letsencrypt' | 'custom' | 'none'
    httpPort: number
    httpsPort: number
    [key: string]: any
  }
  auth: {
    jwtExpiresIn: number
    refreshExpiresIn: number
    smtpHost: string
    smtpPort: number
    smtpSender: string
    [key: string]: any
  }
  storage: {
    accessKey: string
    secretKey: string
    bucket: string
    region: string
    [key: string]: any
  }

  // Optional Services
  optionalServices: {
    redis: boolean
    mail: {
      enabled: boolean
      provider:
        | 'auto'
        | 'mailpit'
        | 'sendgrid'
        | 'ses'
        | 'mailgun'
        | 'postmark'
        | 'gmail'
        | 'outlook'
        | 'brevo'
        | 'resend'
        | 'sparkpost'
        | 'mandrill'
        | 'elastic'
        | 'smtp2go'
        | 'mailersend'
        | 'postfix'
        | 'smtp'
    }
    monitoring: boolean
    search: {
      enabled: boolean
      provider:
        | 'auto'
        | 'meilisearch'
        | 'elasticsearch'
        | 'typesense'
        | 'algolia'
        | 'opensearch'
        | 'sonic'
        | 'postgres'
    }
    mlflow: boolean
    adminUI: boolean
  }

  // Optional Services Configuration
  redisConfig?: {
    port: number
    version: string
    maxMemory: string
    [key: string]: any
  }
  mailConfig?: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPass: string
    smtpSecure: boolean
    fromEmail: string
    [key: string]: any
  }
  monitoringConfig?: {
    grafanaPort: number
    prometheusPort: number
    lokiPort: number
    jaegerPort: number
    [key: string]: any
  }
  searchConfig?: {
    port: number
    apiKey: string
    [key: string]: any
  }
  mlflowConfig?: {
    trackingPort: number
    artifactRoot: string
    [key: string]: any
  }
  nadminConfig?: {
    port: number
    sessionTimeout: number
    enableMetrics: boolean
    enableBackups: boolean
    [key: string]: any
  }

  // Custom Services
  customServices: Array<{
    name: string
    framework: string
    port: number
    route: string
  }>

  // Frontend Apps
  frontendApps: Array<{
    name: string
    displayName: string
    tablePrefix: string
    port: number
    subdomain: string
    framework: string
    deployment: 'local' | 'vercel' | 'netlify' | 'cloudflare' | 'other'
    enabled: boolean
  }>
}

/** Validation error map keyed by ProjectConfig field name (empty string = no error). */
export type ValidationErrors = { [key: string]: string }
