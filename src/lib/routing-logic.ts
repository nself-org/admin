/**
 * Centralized routing logic for nself-admin
 * Determines the correct route based on project status
 */

export interface ProjectStatus {
  hasEnvFile: boolean
  hasDockerCompose: boolean
  servicesRunning: boolean
  containerCount: number
}

export interface RoutingResult {
  route: string
  reason: string
}

/**
 * Determines the correct route based on project status
 * Priority: init → build → start → dashboard
 */
export function determineRoute(status: ProjectStatus): RoutingResult {
  // 1. Not initialized - no env file (blank directory)
  if (!status.hasEnvFile) {
    return {
      route: '/build',
      reason: 'No environment file found - project not initialized',
    }
  }

  // 2. Initialized but not built - has env but no docker-compose
  if (!status.hasDockerCompose) {
    return {
      route: '/build',
      reason: 'Environment file exists but project not built',
    }
  }

  // 3. Built but not running - has docker-compose but no containers
  if (!status.servicesRunning) {
    return {
      route: '/start',
      reason: `Services not running (${status.containerCount} containers)`,
    }
  }

  // 4. Services running - go to dashboard
  return {
    route: '/',
    reason: `Services running (${status.containerCount} containers)`,
  }
}

/**
 * Fetches project status and determines correct route
 */
export async function getCorrectRoute(): Promise<RoutingResult> {
  try {
    const response = await fetch('/api/project/status')
    if (!response.ok) {
      return {
        route: '/build',
        reason: 'Failed to fetch project status - defaulting to build',
      }
    }

    const status: ProjectStatus = await response.json()
    return determineRoute(status)
  } catch (_error) {
    return {
      route: '/build',
      reason: 'Error checking project status - defaulting to build',
    }
  }
}

/**
 * Checks if current page is correct and redirects if needed
 * Returns true if redirect happened, false if current page is correct
 */
export async function ensureCorrectRoute(
  currentPath: string,
  navigate: (path: string) => void,
): Promise<boolean> {
  const result = await getCorrectRoute()

  // Normalize paths for comparison
  const targetPath = result.route
  const normalizedCurrentPath = currentPath === '' ? '/' : currentPath

  // Check if we're on the correct page
  if (normalizedCurrentPath === targetPath) {
    return false // No redirect needed
  }

  // Allow all application sub-pages when services are running (target is dashboard)
  if (
    targetPath === '/' &&
    normalizedCurrentPath !== '/login' &&
    normalizedCurrentPath !== '/build' &&
    normalizedCurrentPath !== '/start'
  ) {
    return false // Allow all pages except setup pages when services are running
  }

  // Allow all /init/* wizard steps when target is /build (project not yet built)
  if (targetPath === '/build' && normalizedCurrentPath.startsWith('/init')) {
    return false // Allow wizard pages during setup
  }

  // Redirect needed
  navigate(targetPath)
  return true // Redirect happened
}
