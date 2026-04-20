import { exec, execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { getCachedProjectInfo, setCachedProjectInfo } from './database'
import { getProjectPath as getProjectPathFromPaths } from './paths'

const execAsync = promisify(exec)

// Re-export the centralized project path function for backward compatibility
export const getProjectPath = getProjectPathFromPaths

// Check if project exists and is valid
export async function checkProjectStatus(): Promise<{
  status: 'not_initialized' | 'initialized' | 'built' | 'running'
  path: string
  error?: string
}> {
  const projectPath = getProjectPath()

  // Check if path exists
  if (!fs.existsSync(projectPath)) {
    return {
      status: 'not_initialized',
      path: projectPath,
      error: 'Project directory does not exist',
    }
  }

  // Check if it's empty
  const files = fs.readdirSync(projectPath)
  if (files.length === 0) {
    return {
      status: 'not_initialized',
      path: projectPath,
    }
  }

  // Check for docker-compose.yml
  const dockerComposePath = path.join(projectPath, 'docker-compose.yml')
  if (!fs.existsSync(dockerComposePath)) {
    return {
      status: 'initialized',
      path: projectPath,
    }
  }

  // Check if containers are running
  try {
    const { stdout } = await execAsync('docker ps --format "{{.Names}}"')
    const runningContainers = stdout.split('\n').filter((name) => name.trim())

    // Check if any project containers are running
    // This is a simplified check - in production you'd want to be more specific
    const projectContainers = runningContainers.filter(
      (name) =>
        name.includes('nself') ||
        name.includes('postgres') ||
        name.includes('hasura'),
    )

    if (projectContainers.length > 0) {
      return {
        status: 'running',
        path: projectPath,
      }
    }
  } catch (error) {
    console.error('Error checking Docker status:', error)
  }

  return {
    status: 'built',
    path: projectPath,
  }
}

// Get project services from docker-compose
export async function getProjectServices(): Promise<{
  services: string[]
  error?: string
}> {
  // Check cache first
  const cached = await getCachedProjectInfo('services')
  if (cached) {
    return { services: cached }
  }

  const projectPath = getProjectPath()
  const dockerComposePath = path.join(projectPath, 'docker-compose.yml')

  if (!fs.existsSync(dockerComposePath)) {
    return {
      services: [],
      error: 'docker-compose.yml not found',
    }
  }

  try {
    const { stdout } = await execAsync(
      `docker-compose -f "${dockerComposePath}" config --services`,
    )
    const services = stdout.split('\n').filter((s) => s.trim())

    // Cache the result
    await setCachedProjectInfo('services', services)

    return { services }
  } catch (error) {
    console.error('Error reading services:', error)
    return {
      services: [],
      error: 'Failed to read services from docker-compose',
    }
  }
}

// Count running containers
export async function getRunningContainers(): Promise<number> {
  // Check cache first
  const cached = await getCachedProjectInfo('running_containers')
  if (cached !== null) {
    return cached
  }

  try {
    const { stdout } = await execAsync(
      'docker ps --format "{{.Names}}" | wc -l',
    )
    const count = parseInt(stdout.trim()) || 0

    // Cache for 10 seconds
    await setCachedProjectInfo('running_containers', count)

    return count
  } catch (error) {
    console.error('Error counting containers:', error)
    return 0
  }
}

// Initialize project with nself init --full
export async function initializeProject(config: any): Promise<{
  success: boolean
  error?: string
}> {
  const projectPath = getProjectPath()
  const nselfPath = path.join(projectPath, 'bin', 'nself')

  // Check if nself CLI exists
  if (!fs.existsSync(nselfPath)) {
    return {
      success: false,
      error: 'nself CLI not found',
    }
  }

  try {
    // Run nself init --full with config
    // Pass config values as environment variables — never interpolate into shell strings
    const execFileAsync = promisify(execFile)
    const envOverrides: Record<string, string> = {}
    for (const [key, value] of Object.entries(config)) {
      envOverrides[key] = String(value)
    }

    await execFileAsync(nselfPath, ['init', '--full'], {
      cwd: projectPath,
      env: { ...process.env, ...envOverrides },
    })

    return { success: true }
  } catch (error) {
    console.error('Error initializing project:', error)
    return {
      success: false,
      error: 'Failed to initialize project',
    }
  }
}

// Get Docker status and containers
export async function getDockerStatus(): Promise<{
  running: boolean
  containers: Array<{
    id: string
    name: string
    state: string
    status: string
  }>
  error: string | null
}> {
  try {
    const { stdout } = await execAsync(
      'docker ps --format "table {{.ID}}\t{{.Names}}\t{{.State}}\t{{.Status}}"',
    )
    const lines = stdout
      .split('\n')
      .slice(1)
      .filter((line) => line.trim()) // Skip header and empty lines

    const containers = lines.map((line) => {
      const parts = line.split('\t')
      return {
        id: parts[0] || '',
        name: parts[1] || '',
        state: parts[2] || 'unknown',
        status: parts[3] || 'unknown',
      }
    })

    return {
      running: containers.length > 0,
      containers,
      error: null,
    }
  } catch (error) {
    console.error('Error getting Docker status:', error)
    return {
      running: false,
      containers: [],
      error: error instanceof Error ? error.message : 'Unknown Docker error',
    }
  }
}

/**
 * Build the nself project by invoking `nself build` in the project directory.
 * The CLI regenerates docker-compose.yml + nginx config from the current .env file.
 * Follows the nSelf-First Doctrine — never runs docker-compose directly.
 */
export async function buildProject(): Promise<{
  success: boolean
  error?: string
}> {
  const projectPath = getProjectPath()
  const nselfPath = path.join(projectPath, 'bin', 'nself')

  if (!fs.existsSync(nselfPath)) {
    return {
      success: false,
      error: 'nself CLI not found',
    }
  }

  try {
    await execAsync(`${nselfPath} build`, {
      cwd: projectPath,
    })

    return { success: true }
  } catch (error) {
    console.error('Error building project:', error)
    return {
      success: false,
      error: 'Failed to build project',
    }
  }
}
