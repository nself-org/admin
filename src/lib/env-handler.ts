import fs from 'fs/promises'
import path from 'path'
import { getProjectPath } from './paths'

interface EnvConfig {
  [key: string]: string
}

// Helper function to properly quote environment variable values
// Values with spaces, special characters, or starting with quotes need to be quoted
function quoteEnvValue(value: string): string {
  // If empty, return empty string
  if (!value) return ''

  // Check if value needs quoting:
  // 1. Contains spaces
  // 2. Contains special shell characters
  // 3. Contains asterisks (for cron expressions)
  // 4. Already quoted (preserve existing quotes)
  const needsQuoting =
    /[\s*#$&|;<>()\\`]/.test(value) ||
    value.includes('"') ||
    value.includes("'")

  // If already properly quoted with double quotes, return as-is
  if (value.startsWith('"') && value.endsWith('"')) {
    return value
  }

  // If already properly quoted with single quotes, return as-is
  if (value.startsWith("'") && value.endsWith("'")) {
    return value
  }

  // If needs quoting, wrap in double quotes and escape any internal double quotes
  if (needsQuoting) {
    // Escape any internal double quotes
    const escaped = value.replace(/"/g, '\\"')
    return `"${escaped}"`
  }

  // Otherwise return as-is
  return value
}

// Read env files in priority order and merge them
export async function readEnvFile(): Promise<EnvConfig | null> {
  try {
    const projectPath = getProjectPath()
    let config: EnvConfig = {}

    // Helper to parse env file content
    const parseEnvContent = (content: string): EnvConfig => {
      const result: EnvConfig = {}
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        const index = trimmed.indexOf('=')
        if (index > 0) {
          const key = trimmed.substring(0, index).trim()
          let value = trimmed.substring(index + 1)

          // Handle quoted values properly
          // If value starts and ends with matching quotes, remove them
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            // Remove the outer quotes
            value = value.slice(1, -1)
            // Unescape any escaped quotes within the value
            if (value.includes('\\"')) {
              value = value.replace(/\\"/g, '"')
            }
            if (value.includes("\\'")) {
              value = value.replace(/\\'/g, "'")
            }
          } else {
            // For unquoted values, just trim whitespace
            value = value.trim()
          }

          result[key] = value
        }
      }
      return result
    }

    // Read files in nself priority order (later files override earlier ones)
    // File Loading Order from nself:
    // 1) .env.dev     (team defaults, SHARED)
    // 2) .env.staging (staging only config, SHARED)
    // 3) .env.prod    (production only config, SHARED)
    // 4) .env.secrets (production secrets, not shared)
    // 5) .env         (LOCAL ONLY priority overrides - highest priority)

    // 1. Read .env.dev (team defaults)
    try {
      const devPath = path.join(projectPath, '.env.dev')
      const content = await fs.readFile(devPath, 'utf-8')
      config = { ...config, ...parseEnvContent(content) }
    } catch {
      // File may not exist
    }

    // 2. Read .env.staging (staging config)
    try {
      const stagingPath = path.join(projectPath, '.env.staging')
      const content = await fs.readFile(stagingPath, 'utf-8')
      config = { ...config, ...parseEnvContent(content) }
    } catch {
      // File may not exist
    }

    // 3. Read .env.prod (production config)
    try {
      const prodPath = path.join(projectPath, '.env.prod')
      const content = await fs.readFile(prodPath, 'utf-8')
      config = { ...config, ...parseEnvContent(content) }
    } catch {
      // File may not exist
    }

    // 4. Read .env.secrets (production secrets)
    try {
      const secretsPath = path.join(projectPath, '.env.secrets')
      const content = await fs.readFile(secretsPath, 'utf-8')
      config = { ...config, ...parseEnvContent(content) }
    } catch {
      // File may not exist
    }

    // 5. Read .env (LOCAL ONLY priority overrides - highest priority)
    try {
      const envPath = path.join(projectPath, '.env')
      const content = await fs.readFile(envPath, 'utf-8')
      config = { ...config, ...parseEnvContent(content) }
    } catch {
      // File may not exist
    }

    return Object.keys(config).length > 0 ? config : null
  } catch (error) {
    console.error('Error reading env files:', error)
    return null
  }
}

// Write to environment-specific file based on ENV setting
export async function writeEnvFile(config: EnvConfig): Promise<void> {
  const projectPath = getProjectPath()

  // Determine which file to write based on environment
  const env = config.ENV || 'dev'

  // Write to environment-specific file based on ENV setting
  // Per nself guidance: write to .env.dev for development, NOT .env (which is for local overrides only)
  let envFileName: string
  switch (env) {
    case 'dev':
    case 'development':
      envFileName = '.env.dev'
      break
    case 'staging':
      envFileName = '.env.staging'
      break
    case 'prod':
    case 'production':
      envFileName = '.env.prod'
      break
    default:
      envFileName = '.env.dev'
  }

  const envPath = path.join(projectPath, envFileName)

  // Build the env file content with better organization
  const lines: string[] = []

  // Minimal header
  lines.push('# nself Configuration - Auto-generated by nself-admin')
  lines.push(`# Environment: ${env}`)
  lines.push('')

  // Core Settings (always at top, no comments needed)
  const coreSettings = [
    'ENV',
    'PROJECT_NAME',
    'BASE_DOMAIN',
    'PROJECT_DESCRIPTION',
  ]
  const coreValues = coreSettings.filter(
    (key) => config[key] !== undefined && config[key] !== '',
  )
  if (coreValues.length > 0) {
    for (const key of coreValues) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Database Configuration
  const dbSettings = ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']
  const dbValues = dbSettings.filter((key) => config[key] !== undefined)
  if (dbValues.length > 0) {
    lines.push('# Database')
    for (const key of dbValues) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Hasura Settings - per spec v1.0
  const hasuraSettings = [
    'HASURA_GRAPHQL_ADMIN_SECRET',
    'HASURA_JWT_KEY',
    'HASURA_JWT_TYPE',
    'HASURA_METADATA_DATABASE_URL',
  ]
  const hasuraValues = hasuraSettings.filter((key) => config[key] !== undefined)
  if (hasuraValues.length > 0) {
    lines.push('# Hasura GraphQL')
    for (const key of hasuraValues) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Custom Services - Dynamic based on actual services (CS_N format only)
  const serviceKeys = Object.keys(config).filter(
    (key) => key.startsWith('CS_') || key === 'SERVICES_ENABLED',
  )

  if (serviceKeys.length > 0) {
    lines.push('# Custom Services')
    // Sort CS_1, CS_2, etc numerically
    const sortedServices = serviceKeys.sort((a, b) => {
      const numA = parseInt(a.replace('CS_', '') || '0')
      const numB = parseInt(b.replace('CS_', '') || '0')
      if (a === 'SERVICES_ENABLED') return -1
      if (b === 'SERVICES_ENABLED') return 1
      return numA - numB
    })
    for (const key of sortedServices) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Frontend Apps - Dynamic based on actual apps
  const frontendKeys = Object.keys(config).filter((key) =>
    key.startsWith('FRONTEND_APP'),
  )
  if (frontendKeys.length > 0) {
    lines.push('# Frontend Applications')
    // Sort by app number then by field
    const sortedFrontend = frontendKeys.sort((a, b) => {
      if (a === 'FRONTEND_APP_COUNT') return -1
      if (b === 'FRONTEND_APP_COUNT') return 1
      const matchA = a.match(/FRONTEND_APP_(\d+)_(.+)/)
      const matchB = b.match(/FRONTEND_APP_(\d+)_(.+)/)
      if (matchA && matchB) {
        const numDiff = parseInt(matchA[1]) - parseInt(matchB[1])
        if (numDiff !== 0) return numDiff
        // Order fields consistently
        const fieldOrder = [
          'DISPLAY_NAME',
          'SYSTEM_NAME',
          'TABLE_PREFIX',
          'PORT',
          'ROUTE',
          'REMOTE_SCHEMA_NAME',
          'REMOTE_SCHEMA_URL',
        ]
        const indexA = fieldOrder.indexOf(matchA[2])
        const indexB = fieldOrder.indexOf(matchB[2])
        return indexA - indexB
      }
      return a.localeCompare(b)
    })
    for (const key of sortedFrontend) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Service Enable Flags - per spec v1.0 include core services
  const serviceFlags = [
    'POSTGRES_ENABLED',
    'HASURA_ENABLED',
    'AUTH_ENABLED',
    'STORAGE_ENABLED', // Core services
    'NSELF_ADMIN_ENABLED',
    'REDIS_ENABLED',
    'MLFLOW_ENABLED',
    'MAILPIT_ENABLED',
    'SEARCH_ENABLED', // Optional services
    'PROMETHEUS_ENABLED',
    'GRAFANA_ENABLED',
    'LOKI_ENABLED',
    'TEMPO_ENABLED',
    'ALERTMANAGER_ENABLED',
    'MONITORING_ENABLED', // Monitoring bundle
  ]
  const enabledServices = serviceFlags.filter((key) => config[key] === 'true')
  const disabledServices = serviceFlags.filter((key) => config[key] === 'false')

  if (enabledServices.length > 0 || disabledServices.length > 0) {
    lines.push('# Service Enable Flags')
    // Write enabled services first
    for (const key of enabledServices) {
      lines.push(`${key}=true`)
    }
    // Then disabled ones
    for (const key of disabledServices) {
      lines.push(`${key}=false`)
    }
    lines.push('')
  }

  // Service Credentials - write credentials for enabled services
  const serviceCredentials: Record<string, string[]> = {
    STORAGE_ENABLED: ['MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD'],
    SEARCH_ENABLED: ['MEILI_MASTER_KEY'],
    MONITORING_ENABLED: ['GRAFANA_ADMIN_PASSWORD'],
    GRAFANA_ENABLED: ['GRAFANA_ADMIN_PASSWORD'],
  }

  const credentialsToWrite: string[] = []
  for (const [flag, creds] of Object.entries(serviceCredentials)) {
    if (config[flag] === 'true') {
      for (const cred of creds) {
        if (config[cred] && !credentialsToWrite.includes(cred)) {
          credentialsToWrite.push(cred)
        }
      }
    }
  }

  if (credentialsToWrite.length > 0) {
    lines.push('# Service Credentials')
    for (const key of credentialsToWrite) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Backup Settings (only if enabled)
  if (config.BACKUP_ENABLED === 'true' || config.DB_BACKUP_ENABLED === 'true') {
    lines.push('# Backup Configuration')
    const backupKeys = [
      'BACKUP_ENABLED',
      'BACKUP_SCHEDULE',
      'BACKUP_RETENTION_DAYS',
      'BACKUP_DIR',
      'BACKUP_COMPRESSION',
      'BACKUP_ENCRYPTION',
    ]
    for (const key of backupKeys) {
      if (config[key] !== undefined) {
        lines.push(`${key}=${quoteEnvValue(config[key])}`)
      }
    }
    lines.push('')
  } else if (
    config.BACKUP_ENABLED === 'false' ||
    config.DB_BACKUP_ENABLED === 'false'
  ) {
    lines.push('# Backup')
    lines.push('BACKUP_ENABLED=false')
    lines.push('')
  }

  // Any remaining variables not in above categories
  const handledKeys = new Set([
    ...coreSettings,
    ...dbSettings,
    ...hasuraSettings,
    ...serviceKeys,
    ...frontendKeys,
    ...serviceFlags,
    'BACKUP_ENABLED',
    'BACKUP_SCHEDULE',
    'BACKUP_RETENTION_DAYS',
    'BACKUP_DIR',
    'BACKUP_COMPRESSION',
    'BACKUP_ENCRYPTION',
    'DB_BACKUP_ENABLED',
    'DB_BACKUP_SCHEDULE',
    'DB_BACKUP_RETENTION_DAYS',
    'DB_BACKUP_STORAGE', // Also handle old format
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
    'MEILI_MASTER_KEY',
    'GRAFANA_ADMIN_PASSWORD', // Service credentials
  ])

  const remainingKeys = Object.keys(config).filter(
    (key) => !handledKeys.has(key),
  )
  if (remainingKeys.length > 0) {
    lines.push('# Additional Settings')
    for (const key of remainingKeys.sort()) {
      lines.push(`${key}=${quoteEnvValue(config[key])}`)
    }
    lines.push('')
  }

  // Write to environment-specific file
  await fs.writeFile(envPath, lines.join('\n'), 'utf-8')
}

// Update specific env variables
export async function updateEnvFile(updates: EnvConfig): Promise<void> {
  const existing = (await readEnvFile()) || {}

  // Merge updates with existing, but handle empty strings specially
  const merged: EnvConfig = { ...existing }

  // Process updates: empty strings delete the key, non-empty values update it
  Object.entries(updates).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) {
      // Delete the key if value is empty
      delete merged[key]
    } else {
      // Update the key with new value
      merged[key] = value
    }
  })

  // If database credentials were updated, rebuild HASURA_METADATA_DATABASE_URL
  if (
    updates.POSTGRES_DB ||
    updates.POSTGRES_USER ||
    updates.POSTGRES_PASSWORD
  ) {
    const dbHost = merged.POSTGRES_HOST || 'postgres'
    const dbPort = merged.POSTGRES_PORT || '5432'
    const dbUser = merged.POSTGRES_USER || 'postgres'
    const dbPass = merged.POSTGRES_PASSWORD || 'postgres'
    const dbName = merged.POSTGRES_DB || 'nself'
    merged.HASURA_METADATA_DATABASE_URL = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`
  }
  await writeEnvFile(merged)
}

// Check if appropriate env file exists for current environment
export async function envFileExists(environment?: string): Promise<boolean> {
  try {
    const projectPath = getProjectPath()
    const env = environment || 'development'

    // Check the appropriate file based on environment
    let fileName = '.env.dev'
    switch (env) {
      case 'development':
      case 'dev':
        fileName = '.env.dev'
        break
      case 'staging':
        fileName = '.env.staging'
        break
      case 'production':
      case 'prod':
        fileName = '.env.prod'
        break
    }

    const envPath = path.join(projectPath, fileName)
    await fs.access(envPath)
    return true
  } catch {
    return false
  }
}

// Convert wizard config to env variables
export function wizardConfigToEnv(config: any): EnvConfig {
  const env: EnvConfig = {}

  // Basic settings - per nself docs, use ENV not ENVIRONMENT
  env.PROJECT_NAME = config.projectName || 'my-project'
  env.PROJECT_DESCRIPTION = config.projectDescription || ''
  env.ENV = config.environment || 'dev' // Use value as-is, nself accepts both dev and development
  env.BASE_DOMAIN = config.domain || 'local.nself.org' // nself default domain

  // Core services are enabled by default per spec v1.0
  env.POSTGRES_ENABLED = 'true' // Always true per spec for backward compatibility
  env.HASURA_ENABLED = 'true' // Always true per spec for backward compatibility
  env.AUTH_ENABLED = 'true' // Always true per spec for backward compatibility
  env.STORAGE_ENABLED = 'true' // Default true per spec

  // Database - respect user input for db name and user
  // Check multiple sources for database configuration
  env.POSTGRES_DB = config.databaseName || 'nself' // Respect user input, default to 'nself'
  env.POSTGRES_PASSWORD = config.databasePassword || 'nself-dev-password'
  // Check postgresqlConfig from Step 2, then other fields
  env.POSTGRES_USER =
    config.postgresqlConfig?.POSTGRES_USER ||
    config.postgresUser ||
    config.databaseUser ||
    'postgres'

  // Also extract other PostgreSQL configs if present
  if (config.postgresqlConfig) {
    if (config.postgresqlConfig.POSTGRES_HOST) {
      env.POSTGRES_HOST = config.postgresqlConfig.POSTGRES_HOST
    }
    if (config.postgresqlConfig.POSTGRES_PORT) {
      env.POSTGRES_PORT = config.postgresqlConfig.POSTGRES_PORT
    }
  }

  // Hasura Configuration - per spec v1.0 use HASURA_JWT_KEY not full JWT_SECRET
  // No fallback: HASURA_GRAPHQL_ADMIN_SECRET must be set explicitly.
  // The startup guard in hasura-client.ts blocks known dev-stub values in production.
  env.HASURA_GRAPHQL_ADMIN_SECRET = config.hasuraAdminSecret || ''
  env.HASURA_JWT_KEY =
    config.jwtSecret || 'development-secret-key-minimum-32-characters-long'
  env.HASURA_JWT_TYPE = 'HS256' // Default per spec

  // Also extract hasuraConfig from Step 2 if present
  if (config.hasuraConfig) {
    Object.keys(config.hasuraConfig).forEach((key) => {
      if (key.startsWith('HASURA_')) {
        env[key] = String(config.hasuraConfig[key])
      }
    })
  }

  // Extract Auth configuration from Step 2 if present
  if (config.authConfig) {
    Object.keys(config.authConfig).forEach((key) => {
      if (key.startsWith('AUTH_')) {
        env[key] = String(config.authConfig[key])
      }
    })
  }

  // Extract Nginx configuration from Step 2 if present
  if (config.nginxConfig) {
    Object.keys(config.nginxConfig).forEach((key) => {
      if (key.startsWith('NGINX_')) {
        env[key] = String(config.nginxConfig[key])
      }
    })
  }

  // Construct database URL for Hasura
  const dbHost = config.postgresHost || 'postgres'
  const dbPort = config.postgresPort || '5432'
  const dbUser = env.POSTGRES_USER || 'postgres'
  const dbPass = env.POSTGRES_PASSWORD || 'postgres'
  const dbName = env.POSTGRES_DB || 'nself'
  env.HASURA_METADATA_DATABASE_URL = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`

  // Optional services - these default to false unless explicitly enabled
  if (config.optionalServices) {
    // Storage is special - already defaulted to true above, can be overridden
    if (
      config.optionalServices.minio !== undefined ||
      config.optionalServices.storage !== undefined
    ) {
      env.STORAGE_ENABLED =
        config.optionalServices.minio || config.optionalServices.storage
          ? 'true'
          : 'false'
    }
    // These default to false (in order: nself-admin, redis, minio, mlflow, mail, search, monitoring)
    env.NSELF_ADMIN_ENABLED =
      config.optionalServices.nadmin || config.optionalServices.admin
        ? 'true'
        : 'false'
    env.REDIS_ENABLED = config.optionalServices.redis ? 'true' : 'false'
    env.MLFLOW_ENABLED = config.optionalServices.mlflow ? 'true' : 'false'
    env.MAILPIT_ENABLED =
      config.optionalServices.mail?.enabled || config.optionalServices.mailpit
        ? 'true'
        : 'false'
    env.SEARCH_ENABLED = config.optionalServices.search ? 'true' : 'false'
    // Monitoring bundle - includes all monitoring services
    if (config.optionalServices.monitoring) {
      env.MONITORING_ENABLED = 'true' // Bundle flag sets all monitoring services
      env.PROMETHEUS_ENABLED = 'true'
      env.GRAFANA_ENABLED = 'true'
      env.LOKI_ENABLED = 'true'
      env.TEMPO_ENABLED = 'true'
      env.ALERTMANAGER_ENABLED = 'true'
    } else {
      env.MONITORING_ENABLED = 'false'
      env.PROMETHEUS_ENABLED = 'false'
      env.GRAFANA_ENABLED = 'false'
      env.LOKI_ENABLED = 'false'
      env.TEMPO_ENABLED = 'false'
      env.ALERTMANAGER_ENABLED = 'false'
    }
  }

  // Add service credentials when services are enabled
  if (env.STORAGE_ENABLED === 'true') {
    env.MINIO_ROOT_USER = config.minioRootUser || 'minioadmin'
    env.MINIO_ROOT_PASSWORD = config.minioRootPassword || 'minioadmin-password'
  }
  if (env.SEARCH_ENABLED === 'true') {
    env.MEILI_MASTER_KEY =
      config.meiliMasterKey || 'meilisearch-master-key-32-chars'
  }
  if (env.MONITORING_ENABLED === 'true') {
    env.GRAFANA_ADMIN_PASSWORD =
      config.grafanaAdminPassword || 'grafana-admin-password'
  }

  // Custom services - Use nself CLI format (CS_N=name:framework:port:route)
  if (config.customServices && config.customServices.length > 0) {
    // First enable services
    env.SERVICES_ENABLED = 'true'

    config.customServices.forEach((service: any, index: number) => {
      const num = index + 1
      // Validate service fields before building the colon-delimited CS_N value.
      // Colons are the delimiter in the CS_N format (name:framework:port:route),
      // so they must not appear inside any field.
      const shellMetaRe = /[:;|&`$(){}[\]<>!\\]/
      const serviceName = String(service.name || '')
      const serviceFramework = String(service.framework || 'custom')
      if (shellMetaRe.test(serviceName) || shellMetaRe.test(serviceFramework)) {
        console.warn(
          `Custom service at index ${index} has invalid characters in name or framework — skipping`,
        )
        return
      }
      // Build the CS_N value in format: name:framework:port:route
      const parts = [
        serviceName,
        serviceFramework,
        service.port || 3000 + num,
        service.route || '', // Empty route is fine
      ]
      env[`CS_${num}`] = parts.join(':')
    })
  }

  // Frontend apps
  if (config.frontendApps && config.frontendApps.length > 0) {
    env.FRONTEND_APP_COUNT = String(config.frontendApps.length)
    config.frontendApps.forEach((app: any, index: number) => {
      const num = index + 1
      env[`FRONTEND_APP_${num}_DISPLAY_NAME`] = app.displayName || ''
      env[`FRONTEND_APP_${num}_SYSTEM_NAME`] = app.systemName || ''
      env[`FRONTEND_APP_${num}_TABLE_PREFIX`] = app.tablePrefix || ''

      // Port for local development
      if (app.localPort) {
        env[`FRONTEND_APP_${num}_PORT`] = String(app.localPort)
      }

      // Route (subdomain in dev, can be full domain in prod)
      if (app.productionUrl) {
        env[`FRONTEND_APP_${num}_ROUTE`] = app.productionUrl
      }

      // Remote schema configuration for Hasura
      if (app.remoteSchemaUrl) {
        env[`FRONTEND_APP_${num}_REMOTE_SCHEMA_URL`] = app.remoteSchemaUrl
        // Auto-generate schema name from table prefix if not provided
        if (!app.remoteSchemaName && app.tablePrefix) {
          env[`FRONTEND_APP_${num}_REMOTE_SCHEMA_NAME`] =
            `${app.tablePrefix}_schema`
        } else if (app.remoteSchemaName) {
          env[`FRONTEND_APP_${num}_REMOTE_SCHEMA_NAME`] = app.remoteSchemaName
        }
      }
    })
  }

  // Backup settings - use nself's BACKUP_* naming
  if (config.backupEnabled !== undefined) {
    env.BACKUP_ENABLED = config.backupEnabled ? 'true' : 'false'
    if (config.backupEnabled) {
      env.BACKUP_SCHEDULE = config.backupSchedule || '0 2 * * *'
      env.BACKUP_RETENTION_DAYS = String(config.backupRetentionDays || 7)
      env.BACKUP_DIR = config.backupDir || '/backups'
      if (config.backupCompression) env.BACKUP_COMPRESSION = 'true'
      if (config.backupEncryption) env.BACKUP_ENCRYPTION = 'true'
    }
  }

  return env
}

// Convert env variables to wizard config
export function envToWizardConfig(env: EnvConfig): any {
  const config: any = {
    projectName: env.PROJECT_NAME || 'nproject',
    projectDescription: env.PROJECT_DESCRIPTION || '',
    environment: env.ENV || 'development', // nself uses ENV, not ENVIRONMENT
    domain: env.BASE_DOMAIN || 'local.nself.org',
    databaseName: env.POSTGRES_DB || 'nself',
    databasePassword: env.POSTGRES_PASSWORD || 'nself-dev-password',
    postgresUser: env.POSTGRES_USER || 'postgres', // Add this field
    hasuraAdminSecret: env.HASURA_GRAPHQL_ADMIN_SECRET || '',
    jwtSecret:
      env.HASURA_JWT_KEY ||
      (() => {
        // For backward compatibility, try to extract from old JWT_SECRET format
        if (env.HASURA_GRAPHQL_JWT_SECRET) {
          try {
            const parsed = JSON.parse(env.HASURA_GRAPHQL_JWT_SECRET)
            return (
              parsed.key || 'development-secret-key-minimum-32-characters-long'
            )
          } catch {
            return env.HASURA_GRAPHQL_JWT_SECRET
          }
        }
        return 'development-secret-key-minimum-32-characters-long'
      })(),
    backupEnabled:
      env.BACKUP_ENABLED === 'true' || env.DB_BACKUP_ENABLED === 'true', // Support both for backwards compat
    backupSchedule:
      env.BACKUP_SCHEDULE || env.DB_BACKUP_SCHEDULE || '0 2 * * *',

    // Extract service configurations from Step 2
    postgresqlConfig: {
      POSTGRES_USER: env.POSTGRES_USER || 'postgres',
      POSTGRES_HOST: env.POSTGRES_HOST || 'postgres',
      POSTGRES_PORT: env.POSTGRES_PORT || '5432',
    },

    // Extract Hasura configuration
    hasuraConfig: Object.keys(env).reduce(
      (acc, key) => {
        if (key.startsWith('HASURA_')) {
          acc[key] = env[key]
        }
        return acc
      },
      {} as Record<string, string>,
    ),

    // Extract Auth configuration
    authConfig: Object.keys(env).reduce(
      (acc, key) => {
        if (key.startsWith('AUTH_')) {
          acc[key] = env[key]
        }
        return acc
      },
      {} as Record<string, string>,
    ),

    // Extract Nginx configuration
    nginxConfig: Object.keys(env).reduce(
      (acc, key) => {
        if (key.startsWith('NGINX_')) {
          acc[key] = env[key]
        }
        return acc
      },
      {} as Record<string, string>,
    ),

    // Pass through all raw env variables so the page can read them
    ...env,

    // Initialize nested objects
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

    // Optional services - per spec v1.0 (in order: nself-admin, redis, minio, mlflow, mail, search, monitoring)
    // Add as top-level fields for easier access in UI
    nadminEnabled:
      env.NSELF_ADMIN_ENABLED === 'true' || env.NADMIN_ENABLED === 'true',
    redisEnabled: env.REDIS_ENABLED === 'true',
    minioEnabled:
      env.STORAGE_ENABLED === 'true' || env.MINIO_ENABLED === 'true',
    mlflowEnabled: env.MLFLOW_ENABLED === 'true',
    mailpitEnabled: env.MAILPIT_ENABLED === 'true',
    searchEnabled: env.SEARCH_ENABLED === 'true',
    monitoringEnabled: env.MONITORING_ENABLED === 'true',
    optionalServices: {
      admin:
        env.NSELF_ADMIN_ENABLED === 'true' || env.NADMIN_ENABLED === 'true', // Support both
      nadmin:
        env.NSELF_ADMIN_ENABLED === 'true' || env.NADMIN_ENABLED === 'true', // Alternative name
      redis: env.REDIS_ENABLED === 'true',
      minio: env.STORAGE_ENABLED === 'true' || env.MINIO_ENABLED === 'true', // Support both for backwards compat
      storage: env.STORAGE_ENABLED === 'true', // Use storage as primary name
      mlflow: env.MLFLOW_ENABLED === 'true',
      mail: {
        enabled: env.MAILPIT_ENABLED === 'true',
        provider: env.EMAIL_PROVIDER || 'mailpit',
      },
      search: env.SEARCH_ENABLED === 'true',
      monitoring:
        env.MONITORING_ENABLED === 'true' ||
        (env.PROMETHEUS_ENABLED === 'true' && env.GRAFANA_ENABLED === 'true'),
    },

    // Custom services
    customServices: [],

    // Frontend apps
    frontendApps: [],
  }

  // Parse custom services - CS_N format only (legacy formats no longer supported)
  for (let i = 1; i <= 99; i++) {
    // Check up to 99 services (nself supports CS_1 through CS_99)
    const serviceDef = env[`CS_${i}`]
    if (serviceDef) {
      const [name, framework, port, route] = serviceDef.split(':')
      if (name) {
        config.customServices.push({
          name,
          framework: framework || 'custom',
          port: port ? parseInt(port) : 4000 + i - 1,
          route: route || undefined,
        })
      }
    }
  }

  // Parse frontend apps
  const frontendAppCount = parseInt(env.FRONTEND_APP_COUNT || '0')
  for (let i = 1; i <= frontendAppCount; i++) {
    const displayName = env[`FRONTEND_APP_${i}_DISPLAY_NAME`]
    const systemName = env[`FRONTEND_APP_${i}_SYSTEM_NAME`]
    const tablePrefix = env[`FRONTEND_APP_${i}_TABLE_PREFIX`]

    // Only add if we have at least a display name or table prefix
    if (displayName || tablePrefix) {
      config.frontendApps.push({
        displayName: displayName || '',
        systemName: systemName || '',
        tablePrefix: tablePrefix || '',
        localPort:
          env[`FRONTEND_APP_${i}_PORT`] || env[`FRONTEND_APP_${i}_LOCAL_PORT`]
            ? parseInt(
                env[`FRONTEND_APP_${i}_PORT`] ||
                  env[`FRONTEND_APP_${i}_LOCAL_PORT`],
              )
            : undefined,
        productionUrl:
          env[`FRONTEND_APP_${i}_ROUTE`] ||
          env[`FRONTEND_APP_${i}_PRODUCTION_URL`] ||
          undefined,
        remoteSchemaName:
          env[`FRONTEND_APP_${i}_REMOTE_SCHEMA_NAME`] || undefined,
        remoteSchemaUrl:
          env[`FRONTEND_APP_${i}_REMOTE_SCHEMA_URL`] || undefined,
      })
    }
  }

  return config
}
