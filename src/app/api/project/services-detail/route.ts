import { getProjectPath } from '@/lib/paths'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

interface ServiceDetail {
  name: string
  image?: string
  container_name?: string
  ports?: string[]
  environment?: Record<string, string>
  depends_on?: string[]
  restart?: string
  volumes?: string[]
  networks?: string[]
  customInfo?: any
}

// Simple parser for docker-compose.yml that handles malformed YAML
function parseDockerCompose(content: string): Record<string, ServiceDetail> {
  const services: Record<string, ServiceDetail> = {}
  const lines = content.split('\n')

  let inServices = false
  let currentService: string | null = null
  let currentServiceData: ServiceDetail | null = null
  let currentSection: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Check if we're entering services section
    if (trimmed === 'services:') {
      inServices = true
      continue
    }

    // Skip if not in services
    if (!inServices) continue

    // Check if we're leaving services section (another top-level key)
    if (line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
      inServices = false
      if (currentService && currentServiceData) {
        services[currentService] = currentServiceData
      }
      break
    }

    // Parse service name (2 spaces indentation)
    if (line.match(/^ {2}[a-zA-Z][a-zA-Z0-9_-]*:/)) {
      // Save previous service
      if (currentService && currentServiceData) {
        services[currentService] = currentServiceData
      }

      currentService = trimmed.replace(':', '')
      currentServiceData = { name: currentService }
      currentSection = null
      continue
    }

    // Parse service properties (4 spaces indentation)
    if (currentService && currentServiceData && line.match(/^ {4}[a-zA-Z]/)) {
      const propLine = line.substring(4)

      if (propLine.startsWith('image:')) {
        currentServiceData.image = propLine.replace('image:', '').trim()
        currentSection = null
      } else if (propLine.startsWith('container_name:')) {
        currentServiceData.container_name = propLine
          .replace('container_name:', '')
          .trim()
        currentSection = null
      } else if (propLine.startsWith('restart:')) {
        currentServiceData.restart = propLine.replace('restart:', '').trim()
        currentSection = null
      } else if (propLine.startsWith('ports:')) {
        currentServiceData.ports = []
        currentSection = 'ports'
      } else if (propLine.startsWith('environment:')) {
        currentServiceData.environment = {}
        currentSection = 'environment'
      } else if (propLine.startsWith('depends_on:')) {
        currentServiceData.depends_on = []
        currentSection = 'depends_on'
      } else if (propLine.startsWith('volumes:')) {
        currentServiceData.volumes = []
        currentSection = 'volumes'
      } else if (propLine.startsWith('networks:')) {
        currentServiceData.networks = []
        currentSection = 'networks'
      }
    }

    // Parse list items (6 or 8 spaces indentation)
    if (
      currentSection &&
      currentServiceData &&
      (line.match(/^ {6}- /) || line.match(/^ {8}/))
    ) {
      const item = line.replace(/^ {6}- |^ {8}/, '').trim()

      if (currentSection === 'ports' && currentServiceData.ports) {
        currentServiceData.ports.push(item.replace(/"/g, ''))
      } else if (
        currentSection === 'depends_on' &&
        currentServiceData.depends_on
      ) {
        // Handle both simple list and object format
        const serviceName = item.split(':')[0].trim()
        if (!currentServiceData.depends_on.includes(serviceName)) {
          currentServiceData.depends_on.push(serviceName)
        }
      } else if (
        currentSection === 'environment' &&
        currentServiceData.environment
      ) {
        const [key, ...valueParts] = item.split(':')
        if (key) {
          const value = valueParts.join(':').trim()
          currentServiceData.environment[key] = value
        }
      } else if (currentSection === 'volumes' && currentServiceData.volumes) {
        currentServiceData.volumes.push(item)
      } else if (currentSection === 'networks' && currentServiceData.networks) {
        currentServiceData.networks.push(item)
      }
    }
  }

  // Save last service
  if (currentService && currentServiceData) {
    services[currentService] = currentServiceData
  }

  return services
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    let services: Record<string, ServiceDetail> = {}

    // Parse main docker-compose.yml
    const dockerComposePath = path.join(projectPath, 'docker-compose.yml')
    if (fs.existsSync(dockerComposePath)) {
      try {
        const yamlContent = fs.readFileSync(dockerComposePath, 'utf8')
        services = parseDockerCompose(yamlContent)
      } catch (error) {
        console.error('Error reading docker-compose.yml:', error)
      }
    }

    // Parse custom docker-compose.custom.yml if exists
    const customComposePath = path.join(
      projectPath,
      'docker-compose.custom.yml',
    )
    if (fs.existsSync(customComposePath)) {
      try {
        const yamlContent = fs.readFileSync(customComposePath, 'utf8')
        const customServices = parseDockerCompose(yamlContent)

        // Merge custom services, skipping nself CLI service
        Object.entries(customServices).forEach(([name, service]) => {
          if (name !== 'nself') {
            services[name] = service
          }
        })
      } catch (error) {
        console.error('Error reading docker-compose.custom.yml:', error)
      }
    }

    // Also read custom service details from .env file
    const envFiles = [
      '.env.dev',
      '.env.staging',
      '.env.prod',
      '.env.local',
      '.env',
    ]
    let customServiceInfo: Record<string, any> = {}

    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile)
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')

        // Parse custom service definitions (CS_1, CS_2, etc.)
        for (let i = 1; i <= 99; i++) {
          const csMatch = envContent.match(new RegExp(`CS_${i}=(.+)`))
          if (csMatch && csMatch[1].trim()) {
            const parts = csMatch[1].split(':')
            const serviceName = parts[0]?.trim()
            if (serviceName) {
              customServiceInfo[serviceName] = {
                type: parts[1]?.trim(),
                port: parts[2]?.trim(),
                route: parts[3]?.trim(),
                env: parts[4]?.trim(),
              }
            }
          } else {
            break // Stop when we hit an empty slot
          }
        }
        break // Use first env file found
      }
    }

    // Merge custom service info with docker-compose data
    Object.keys(services).forEach((name) => {
      if (customServiceInfo[name]) {
        services[name] = {
          ...services[name],
          customInfo: customServiceInfo[name],
        }
      }
    })

    return NextResponse.json({
      success: true,
      services,
      projectPath,
    })
  } catch (error) {
    console.error('Error getting service details:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get service details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
