import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // Use the same project path as the build API uses (from getProjectPath)
    const projectPath = getProjectPath()
    let projectInfo: any = {
      projectName: 'nself-project',
      environment: 'development',
      database: 'PostgreSQL',
      services: [],
      servicesByCategory: {
        required: [],
        optional: [],
        user: [],
      },
      status: 'built',
      totalServices: 0,
      projectPath: projectPath,
    }

    // Read .env.dev for project configuration (or .env.prod, .env.staging based on ENV)
    try {
      // Try multiple env files in order of priority
      const envFiles = [
        '.env.dev',
        '.env.staging',
        '.env.prod',
        '.env.local',
        '.env',
      ]
      let envContent = ''

      for (const envFile of envFiles) {
        const envPath = path.join(projectPath, envFile)
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8')
          break // Use the first one found
        }
      }

      if (envContent) {
        // Parse important values from .env.local
        const projectNameMatch = envContent.match(/PROJECT_NAME=(.+)/)
        const envMatch = envContent.match(/ENV=(.+)/)
        const domainMatch = envContent.match(/BASE_DOMAIN=(.+)/)
        const dbNameMatch = envContent.match(/POSTGRES_DB=(.+)/)
        const dbPasswordMatch = envContent.match(/POSTGRES_PASSWORD=(.+)/)
        const backupEnabledMatch = envContent.match(/BACKUP_ENABLED=(.+)/)
        const backupScheduleMatch = envContent.match(/BACKUP_SCHEDULE=(.+)/)
        const monitoringEnabledMatch = envContent.match(
          /MONITORING_ENABLED=(.+)/,
        )
        const frontendAppsMatch = envContent.match(/FRONTEND_APPS="(.+)"/)

        // Count enabled services from env file
        const redisEnabled = envContent.match(/REDIS_ENABLED=true/)
        const mlflowEnabled = envContent.match(/MLFLOW_ENABLED=true/)
        const mailpitEnabled = envContent.match(/MAILPIT_ENABLED=true/)
        // Support both SEARCH_ENABLED and MEILISEARCH_ENABLED
        const searchEnabled =
          envContent.match(/SEARCH_ENABLED=true/) ||
          envContent.match(/MEILISEARCH_ENABLED=true/)
        // Support both STORAGE_ENABLED and MINIO_ENABLED
        const storageEnabled =
          envContent.match(/STORAGE_ENABLED=true/) ||
          envContent.match(/MINIO_ENABLED=true/)
        const functionsEnabled = envContent.match(/FUNCTIONS_ENABLED=true/)
        const nselfAdminEnabled = envContent.match(/NSELF_ADMIN_ENABLED=true/)

        // Count custom services
        let customServiceCount = 0
        for (let i = 1; i <= 99; i++) {
          const csMatch = envContent.match(new RegExp(`CS_${i}=(.+)`))
          if (csMatch && csMatch[1].trim()) {
            customServiceCount++
          } else {
            break // Stop when we hit an empty slot
          }
        }

        if (projectNameMatch)
          projectInfo.projectName = projectNameMatch[1].trim()
        if (envMatch) projectInfo.environment = envMatch[1].trim()
        if (domainMatch) projectInfo.domain = domainMatch[1].trim()
        if (dbNameMatch) projectInfo.databaseName = dbNameMatch[1].trim()
        if (dbPasswordMatch) projectInfo.dbPassword = dbPasswordMatch[1].trim()
        if (backupEnabledMatch)
          projectInfo.backupEnabled = backupEnabledMatch[1].trim() === 'true'
        if (backupScheduleMatch)
          projectInfo.backupSchedule = backupScheduleMatch[1].trim()
        if (monitoringEnabledMatch)
          projectInfo.monitoringEnabled =
            monitoringEnabledMatch[1].trim() === 'true'

        // Calculate total services based on enabled flags
        let totalServices = 4 // Core services: PostgreSQL, Hasura, Auth, Nginx (always enabled)

        // Add optional services
        if (storageEnabled) totalServices++ // MinIO/Storage
        if (redisEnabled) totalServices++
        if (functionsEnabled) totalServices++ // Functions service
        if (mlflowEnabled) totalServices++
        if (mailpitEnabled) totalServices++
        if (searchEnabled) totalServices++ // Meilisearch
        if (nselfAdminEnabled) totalServices++ // nself-admin

        // Monitoring adds 8 services when enabled:
        // Prometheus, Grafana, Loki, Tempo, Alertmanager, Node Exporter, PostgreSQL Exporter, cAdvisor
        if (
          monitoringEnabledMatch &&
          monitoringEnabledMatch[1].trim() === 'true'
        ) {
          totalServices += 8
        }

        // Add custom services
        totalServices += customServiceCount

        projectInfo.totalServices = totalServices
        projectInfo.customServiceCount = customServiceCount

        // Debug logging
        const monitoringEnabled =
          monitoringEnabledMatch && monitoringEnabledMatch[1].trim() === 'true'
        // Parse frontend apps
        if (frontendAppsMatch) {
          const appsStr = frontendAppsMatch[1]
          projectInfo.frontendApps = appsStr.split(',').map((app) => {
            const [name, label, , port] = app.split(':')
            return { name, label, port }
          })
        }
      }
    } catch (error) {
      console.error('Error reading env file:', error)
    }

    // Read docker-compose.yml to get actual services
    const allServices: string[] = []

    // Parse main docker-compose.yml
    try {
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml')
      if (fs.existsSync(dockerComposePath)) {
        const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8')

        // Parse services section only
        const lines = dockerComposeContent.split('\n')
        let inServices = false
        let _currentIndent = 0

        for (const line of lines) {
          // Check if we're entering the services section
          if (line.trim() === 'services:') {
            inServices = true
            _currentIndent = line.indexOf('services:')
            continue
          }

          // Check if we're leaving the services section (another top-level key)
          if (inServices && line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
            inServices = false
            continue
          }

          // Parse service names (they have exactly 2 spaces after 'services:')
          if (inServices && line.match(/^ {2}[a-zA-Z][a-zA-Z0-9_-]*:/)) {
            const serviceName = line.trim().replace(':', '')
            // Skip duplicates and helper services
            if (
              !allServices.includes(serviceName) &&
              serviceName !== 'mlflow-init'
            ) {
              allServices.push(serviceName)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading docker-compose.yml:', error)
    }

    // Parse custom services from docker-compose.custom.yml
    try {
      const customComposePath = path.join(
        projectPath,
        'docker-compose.custom.yml',
      )
      if (fs.existsSync(customComposePath)) {
        const customComposeContent = fs.readFileSync(customComposePath, 'utf8')

        // Parse services section only
        const lines = customComposeContent.split('\n')
        let inServices = false

        for (const line of lines) {
          // Check if we're entering the services section
          if (line.trim() === 'services:') {
            inServices = true
            continue
          }

          // Check if we're leaving the services section (another top-level key)
          if (inServices && line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
            inServices = false
            continue
          }

          // Parse service names (they have exactly 2 spaces after 'services:')
          if (inServices && line.match(/^ {2}[a-zA-Z][a-zA-Z0-9_-]*:/)) {
            const serviceName = line.trim().replace(':', '')
            // Skip the nself CLI service and duplicates
            if (serviceName !== 'nself' && !allServices.includes(serviceName)) {
              allServices.push(serviceName)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading docker-compose.custom.yml:', error)
    }

    // Set services and categorize them
    projectInfo.services = allServices
    // Only override totalServices if we actually found services in docker-compose
    // Otherwise keep the count from the env file
    if (allServices.length > 0) {
      projectInfo.totalServices = allServices.length
    }

    // Categorize services
    allServices.forEach((service) => {
      const lowerName = service.toLowerCase()

      // Core/Required services (exactly 4) - must be exact match
      if (
        lowerName === 'postgres' ||
        lowerName === 'hasura' ||
        lowerName === 'auth' ||
        lowerName === 'nginx'
      ) {
        projectInfo.servicesByCategory.required.push(service)
      }
      // Optional services including monitoring stack and nself features
      else if (
        lowerName === 'nself-admin' || // Put nself-admin first
        lowerName === 'redis' ||
        lowerName === 'minio' ||
        lowerName === 'storage' ||
        lowerName === 'functions' ||
        lowerName === 'mailpit' ||
        lowerName === 'meilisearch' ||
        lowerName === 'mlflow' ||
        lowerName === 'grafana' ||
        lowerName === 'prometheus' ||
        lowerName === 'loki' ||
        lowerName === 'tempo' ||
        lowerName === 'jaeger' ||
        lowerName === 'alertmanager' ||
        lowerName === 'node-exporter' ||
        lowerName === 'postgres-exporter' ||
        lowerName === 'cadvisor'
      ) {
        projectInfo.servicesByCategory.optional.push(service)
      }
      // Custom/User services (only actual custom services like cs1, cs2, etc.)
      else {
        projectInfo.servicesByCategory.user.push(service)
      }
    })

    // Sort required services in specific order
    const requiredOrder = ['postgres', 'hasura', 'auth', 'nginx']
    projectInfo.servicesByCategory.required.sort((a: string, b: string) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aIndex = requiredOrder.indexOf(aLower)
      const bIndex = requiredOrder.indexOf(bLower)

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      return 0
    })

    // Sort optional services in the specific order requested
    const optionalOrder = [
      'nself-admin',
      'redis',
      'minio',
      'storage',
      'functions',
      'mailpit',
      'meilisearch',
      'mlflow',
      'prometheus',
      'grafana',
      'loki',
      'tempo',
      'alertmanager',
      'jaeger',
      'node-exporter',
      'postgres-exporter',
      'cadvisor',
    ]

    projectInfo.servicesByCategory.optional.sort((a: string, b: string) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aIndex = optionalOrder.findIndex((service) => aLower === service)
      const bIndex = optionalOrder.findIndex((service) => bLower === service)

      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      // If only a is in the list, it comes first
      if (aIndex !== -1) return -1
      // If only b is in the list, it comes first
      if (bIndex !== -1) return 1
      // Neither in list, keep original order
      return 0
    })

    // Try docker-compose command as backup
    if (projectInfo.services.length === 0) {
      try {
        const { stdout: servicesOutput } = await execAsync(
          'docker-compose config --services 2>/dev/null',
          {
            cwd: projectPath,
            timeout: 5000,
          },
        )

        const servicesList = servicesOutput.split('\n').filter((s) => s.trim())
        if (servicesList.length > 0) {
          projectInfo.services = servicesList
          projectInfo.totalServices = servicesList.length

          // Categorize services (same logic as above)
          servicesList.forEach((service) => {
            const lowerName = service.toLowerCase()
            // Core/Required services (exactly 4) - must be exact match
            if (
              lowerName === 'postgres' ||
              lowerName === 'hasura' ||
              lowerName === 'auth' ||
              lowerName === 'nginx'
            ) {
              projectInfo.servicesByCategory.required.push(service)
            }
            // Optional services
            else if (
              lowerName === 'redis' ||
              lowerName === 'minio' ||
              lowerName === 'storage' ||
              lowerName === 'functions' ||
              lowerName === 'mailpit' ||
              lowerName === 'meilisearch' ||
              lowerName === 'mlflow' ||
              lowerName === 'nself-admin' ||
              lowerName === 'grafana' ||
              lowerName === 'prometheus' ||
              lowerName === 'loki' ||
              lowerName === 'tempo' ||
              lowerName === 'jaeger' ||
              lowerName === 'alertmanager' ||
              lowerName === 'node-exporter' ||
              lowerName === 'postgres-exporter' ||
              lowerName === 'cadvisor'
            ) {
              projectInfo.servicesByCategory.optional.push(service)
            } else {
              projectInfo.servicesByCategory.user.push(service)
            }
          })

          // Sort required services in specific order
          const requiredOrder = ['postgres', 'hasura', 'auth', 'nginx']
          projectInfo.servicesByCategory.required.sort(
            (a: string, b: string) => {
              const aLower = a.toLowerCase()
              const bLower = b.toLowerCase()
              const aIndex = requiredOrder.indexOf(aLower)
              const bIndex = requiredOrder.indexOf(bLower)

              if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex
              }
              return 0
            },
          )

          // Apply the same sorting to optional services
          const optionalOrder = [
            'nself-admin',
            'redis',
            'minio',
            'storage',
            'functions',
            'mailpit',
            'meilisearch',
            'mlflow',
            'prometheus',
            'grafana',
            'loki',
            'tempo',
            'alertmanager',
            'jaeger',
            'node-exporter',
            'postgres-exporter',
            'cadvisor',
          ]

          projectInfo.servicesByCategory.optional.sort(
            (a: string, b: string) => {
              const aLower = a.toLowerCase()
              const bLower = b.toLowerCase()
              const aIndex = optionalOrder.findIndex(
                (service) => aLower === service,
              )
              const bIndex = optionalOrder.findIndex(
                (service) => bLower === service,
              )

              if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex
              }
              if (aIndex !== -1) return -1
              if (bIndex !== -1) return 1
              return 0
            },
          )
        }
      } catch {
      }
    }

    return NextResponse.json({
      success: true,
      data: projectInfo,
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get project info',
      },
      { status: 500 },
    )
  }
}
