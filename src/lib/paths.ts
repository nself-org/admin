import os from 'os'
import path from 'path'

/**
 * Project path utilities for nself-admin
 */

/**
 * Get the project path from environment variable
 * Uses NSELF_PROJECT_PATH or PROJECT_PATH from environment
 *
 * Priority:
 * 1. NSELF_PROJECT_PATH env var
 * 2. PROJECT_PATH env var
 * 3. Default relative path '../nself-project' (development) or '/workspace' (production)
 */
export function getProjectPath(): string {
  const isProduction = process.env.NODE_ENV === 'production'

  // Check both NSELF_PROJECT_PATH and PROJECT_PATH for compatibility
  let projectPath =
    process.env.NSELF_PROJECT_PATH ||
    process.env.PROJECT_PATH ||
    (isProduction ? '/workspace' : '../nself-project')

  // Handle tilde expansion for home directory
  if (projectPath.startsWith('~')) {
    projectPath = projectPath.replace(/^~/, os.homedir())
  }

  // If it's a relative path, resolve it relative to the app root
  if (!projectPath.startsWith('/')) {
    // In development, resolve relative to current working directory
    if (!isProduction) {
      return path.resolve(process.cwd(), projectPath)
    }
    // In production, relative paths are relative to the container's working directory
    return path.resolve('/app', projectPath)
  }

  // Absolute path - use as-is
  return projectPath
}

/**
 * Get the Docker socket path based on platform
 */
export function getDockerSocketPath(): string {
  const home = process.env.HOME || os.homedir()
  const user = process.env.USER || os.userInfo().username

  // In container, Docker socket is always mounted at /var/run/docker.sock
  if (process.env.NODE_ENV === 'production') {
    return '/var/run/docker.sock'
  }

  // Development fallback paths
  const possiblePaths = [
    '/var/run/docker.sock',
    path.join(home, '.docker', 'run', 'docker.sock'),
    `/Users/${user}/.docker/run/docker.sock`,
  ]

  return possiblePaths[0] ?? '/var/run/docker.sock' // Default to standard path
}
