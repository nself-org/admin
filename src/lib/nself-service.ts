import { exec } from 'child_process'
import { promisify } from 'util'
import { findNselfPath, getEnhancedPath } from './nself-path'
import { getProjectPath } from './paths'

const execAsync = promisify(exec)

export interface NselfServiceResult {
  success: boolean
  output: string
  error?: string
}

/**
 * Execute an nself service command
 */
export async function execNselfService(serviceCommand: string): Promise<NselfServiceResult> {
  try {
    const nselfPath = await findNselfPath()
    const projectPath = getProjectPath()
    const enhancedPath = getEnhancedPath()

    const { stdout, stderr } = await execAsync(`${nselfPath} service ${serviceCommand}`, {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: enhancedPath,
      },
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    })

    return {
      success: true,
      output: stdout || stderr || '',
    }
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    return {
      success: false,
      output: err.stdout || err.stderr || '',
      error: err.message || 'Command execution failed',
    }
  }
}

/**
 * Get service status from docker
 */
export async function getServiceStatus(serviceName: string): Promise<NselfServiceResult> {
  return execNselfService(`status ${serviceName}`)
}

/**
 * Get service configuration
 */
export async function getServiceConfig(serviceName: string): Promise<NselfServiceResult> {
  return execNselfService(`config ${serviceName}`)
}

/**
 * Get service logs
 */
export async function getServiceLogs(serviceName: string, tail = 100): Promise<NselfServiceResult> {
  return execNselfService(`logs ${serviceName} --tail=${tail}`)
}

/**
 * Start a service
 */
export async function startService(serviceName: string): Promise<NselfServiceResult> {
  return execNselfService(`start ${serviceName}`)
}

/**
 * Stop a service
 */
export async function stopService(serviceName: string): Promise<NselfServiceResult> {
  return execNselfService(`stop ${serviceName}`)
}

/**
 * Restart a service
 */
export async function restartService(serviceName: string): Promise<NselfServiceResult> {
  return execNselfService(`restart ${serviceName}`)
}
