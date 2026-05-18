import { create } from 'zustand'

interface CustomService {
  name: string
  framework: string
  port: number
  route?: string
}

interface FrontendApp {
  displayName: string
  systemName: string
  tablePrefix: string
  localPort: number
  productionUrl: string
  remoteSchemaName?: string
  remoteSchemaUrl?: string
}

interface WizardState {
  // Step 1 - Basic Configuration
  projectName: string
  projectDescription: string
  environment: string
  domain: string
  databaseName: string
  databaseUser: string
  databasePassword: string
  hasuraAdminSecret: string
  jwtSecret: string
  backupEnabled: boolean
  backupSchedule: string
  adminEmail?: string

  // Step 2 - Required Services Configs
  postgresqlConfig: Record<string, any>
  hasuraConfig: Record<string, any>
  authConfig: Record<string, any>
  nginxConfig: Record<string, any>

  // Step 3 - Optional Services
  optionalServices: {
    nadmin?: boolean
    redis?: boolean
    minio?: boolean
    mlflow?: boolean
    mailpit?: boolean
    search?: boolean
    monitoring?: boolean
    functions?: boolean
  }
  minioRootUser?: string
  minioRootPassword?: string
  meiliMasterKey?: string
  grafanaAdminPassword?: string

  // Step 4 - Custom Services
  customServices: CustomService[]

  // Step 5 - Frontend Apps
  frontendApps: FrontendApp[]

  // Meta
  isLoading: boolean
  isInitialized: boolean
  lastSync: number

  // Actions
  setBasicConfig: (config: Partial<WizardState>) => void
  setServiceConfig: (service: string, config: Record<string, any>) => void
  setOptionalServices: (services: WizardState['optionalServices']) => void
  setCustomServices: (services: CustomService[]) => void
  setFrontendApps: (apps: FrontendApp[]) => void
  loadFromEnv: (envData: Record<string, any>) => void
  syncWithEnv: () => Promise<void>
  reset: () => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
}

const initialState = {
  // Step 1
  projectName: 'my-project',
  projectDescription: '',
  environment: 'dev',
  domain: 'local.nself.org',
  databaseName: 'nself',
  databaseUser: 'postgres',
  databasePassword: 'nself-dev-password',
  hasuraAdminSecret: 'hasura-admin-secret-dev',
  jwtSecret: 'development-secret-key-minimum-32-characters-long',
  backupEnabled: true,
  backupSchedule: '0 2 * * *',

  // Step 2
  postgresqlConfig: {},
  hasuraConfig: {},
  authConfig: {},
  nginxConfig: {},

  // Step 3
  optionalServices: {
    nadmin: false,
    redis: false,
    minio: true,
    mlflow: false,
    mailpit: false,
    search: false,
    monitoring: false,
    functions: false,
  },

  // Step 4
  customServices: [],

  // Step 5
  frontendApps: [],

  // Meta
  isLoading: false,
  isInitialized: false,
  lastSync: 0,
}

export const useWizardStore = create<WizardState>()((set, get) => ({
  ...initialState,

  setBasicConfig: (config) =>
    set((state) => ({
      ...state,
      ...config,
      lastSync: Date.now(),
    })),

  setServiceConfig: (service, config) =>
    set((state) => ({
      ...state,
      [`${service}Config`]: config,
      lastSync: Date.now(),
    })),

  setOptionalServices: (services) =>
    set((state) => ({
      ...state,
      optionalServices: services,
      lastSync: Date.now(),
    })),

  setCustomServices: (services) =>
    set((state) => ({
      ...state,
      customServices: services,
      lastSync: Date.now(),
    })),

  setFrontendApps: (apps) =>
    set((state) => ({
      ...state,
      frontendApps: apps,
      lastSync: Date.now(),
    })),

  loadFromEnv: (envData) => {
    const state: Partial<WizardState> = {
      isInitialized: true,
      lastSync: Date.now(),
    }

    // Map env variables to state
    if (envData.PROJECT_NAME) state.projectName = envData.PROJECT_NAME
    if (envData.PROJECT_DESCRIPTION) state.projectDescription = envData.PROJECT_DESCRIPTION
    if (envData.ENV) state.environment = envData.ENV
    if (envData.BASE_DOMAIN) state.domain = envData.BASE_DOMAIN
    if (envData.POSTGRES_DB) state.databaseName = envData.POSTGRES_DB
    if (envData.POSTGRES_USER) state.databaseUser = envData.POSTGRES_USER
    if (envData.POSTGRES_PASSWORD) state.databasePassword = envData.POSTGRES_PASSWORD
    if (envData.HASURA_GRAPHQL_ADMIN_SECRET)
      state.hasuraAdminSecret = envData.HASURA_GRAPHQL_ADMIN_SECRET
    if (envData.HASURA_JWT_KEY) state.jwtSecret = envData.HASURA_JWT_KEY
    if (envData.BACKUP_ENABLED) state.backupEnabled = envData.BACKUP_ENABLED === 'true'
    if (envData.BACKUP_SCHEDULE) state.backupSchedule = envData.BACKUP_SCHEDULE
    if (envData.ADMIN_EMAIL) state.adminEmail = envData.ADMIN_EMAIL

    // Load service configs
    const postgresqlConfig: Record<string, any> = {}
    const hasuraConfig: Record<string, any> = {}
    const authConfig: Record<string, any> = {}
    const nginxConfig: Record<string, any> = {}

    Object.keys(envData).forEach((key) => {
      if (key.startsWith('POSTGRES_') && key !== 'POSTGRES_DB' && key !== 'POSTGRES_PASSWORD') {
        postgresqlConfig[key] = envData[key]
      } else if (key.startsWith('HASURA_')) {
        hasuraConfig[key] = envData[key]
      } else if (key.startsWith('AUTH_')) {
        authConfig[key] = envData[key]
      } else if (key.startsWith('NGINX_')) {
        nginxConfig[key] = envData[key]
      }
    })

    state.postgresqlConfig = postgresqlConfig
    state.hasuraConfig = hasuraConfig
    state.authConfig = authConfig
    state.nginxConfig = nginxConfig

    // Load optional services
    state.optionalServices = {
      nadmin: envData.NSELF_ADMIN_ENABLED === 'true',
      redis: envData.REDIS_ENABLED === 'true',
      minio: envData.STORAGE_ENABLED === 'true' || envData.MINIO_ENABLED === 'true',
      mlflow: envData.MLFLOW_ENABLED === 'true',
      mailpit: envData.MAILPIT_ENABLED === 'true',
      search: envData.SEARCH_ENABLED === 'true',
      monitoring: envData.MONITORING_ENABLED === 'true',
      functions: envData.FUNCTIONS_ENABLED === 'true',
    }

    if (envData.MINIO_ROOT_USER) state.minioRootUser = envData.MINIO_ROOT_USER
    if (envData.MINIO_ROOT_PASSWORD) state.minioRootPassword = envData.MINIO_ROOT_PASSWORD
    if (envData.MEILI_MASTER_KEY) state.meiliMasterKey = envData.MEILI_MASTER_KEY
    if (envData.GRAFANA_ADMIN_PASSWORD) state.grafanaAdminPassword = envData.GRAFANA_ADMIN_PASSWORD

    // Load custom services
    const customServices: CustomService[] = []
    for (let i = 1; i <= 99; i++) {
      const serviceDef = envData[`CS_${i}`]
      if (serviceDef) {
        const [name, framework, port, route] = serviceDef.split(':')
        if (name) {
          customServices.push({
            name,
            framework: framework || 'custom',
            port: parseInt(port) || 4000 + i - 1,
            route: route || undefined,
          })
        }
      }
    }
    state.customServices = customServices

    // Load frontend apps
    const frontendApps: FrontendApp[] = []
    const appCount = parseInt(envData.FRONTEND_APP_COUNT || '0')
    for (let i = 1; i <= appCount; i++) {
      const app: FrontendApp = {
        displayName: envData[`FRONTEND_APP_${i}_DISPLAY_NAME`] || '',
        systemName: envData[`FRONTEND_APP_${i}_SYSTEM_NAME`] || '',
        tablePrefix: envData[`FRONTEND_APP_${i}_TABLE_PREFIX`] || '',
        localPort: parseInt(envData[`FRONTEND_APP_${i}_PORT`] || '0'),
        productionUrl: envData[`FRONTEND_APP_${i}_ROUTE`] || '',
        remoteSchemaName: envData[`FRONTEND_APP_${i}_REMOTE_SCHEMA_NAME`],
        remoteSchemaUrl: envData[`FRONTEND_APP_${i}_REMOTE_SCHEMA_URL`],
      }
      if (app.displayName || app.tablePrefix) {
        frontendApps.push(app)
      }
    }
    state.frontendApps = frontendApps

    set(state as WizardState)
  },

  syncWithEnv: async () => {
    set({ isLoading: true })
    try {
      // Load current env file
      const response = await fetch('/api/env/read')
      if (response.ok) {
        const data = await response.json()
        if (data.env) {
          get().loadFromEnv(data.env)
          // Mark as initialized only after loading from env
          set({ isInitialized: true })
        }
      }
    } catch (error) {
      console.error('Failed to sync with env:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  reset: () => set(initialState),

  setLoading: (loading) => set({ isLoading: loading }),

  setInitialized: (initialized) => set({ isInitialized: initialized }),
}))
