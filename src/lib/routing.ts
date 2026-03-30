import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Track if we're currently navigating to prevent bouncing
let isNavigating = false
let lastNavigationTime = 0
let lastNavigationPath = ''

// Minimum time between navigation attempts to the same path (ms)
const NAVIGATION_COOLDOWN = 1000

export function safeNavigate(
  router: AppRouterInstance,
  path: string,
  force: boolean = false,
) {
  const now = Date.now()

  // Prevent duplicate navigation attempts
  if (isNavigating && !force) {
    return false
  }

  // Prevent rapid navigation to the same path
  if (
    lastNavigationPath === path &&
    now - lastNavigationTime < NAVIGATION_COOLDOWN &&
    !force
  ) {
    return false
  }

  // Check if we're already on the target path
  if (
    typeof window !== 'undefined' &&
    window.location.pathname === path &&
    !force
  ) {
    return false
  }

  isNavigating = true
  lastNavigationTime = now
  lastNavigationPath = path

  // Reset navigation flag after a short delay
  setTimeout(() => {
    isNavigating = false
  }, 500)

  router.push(path)
  return true
}

// Helper to determine the correct route based on project state
export async function getTargetRoute(projectStatus: any): Promise<string> {
  try {
    // Check project status from API
    const response = await fetch('/api/project/status')
    if (!response.ok) {
      return '/login' // If we can't check status, assume not logged in
    }

    const statusData = await response.json()

    // Priority 1: No env file or docker-compose means not initialized
    if (!statusData.hasEnvFile && !statusData.hasDockerCompose) {
      return '/init'
    }

    // Priority 2: Has env file but no docker-compose means in setup
    if (statusData.hasEnvFile && !statusData.hasDockerCompose) {
      return '/init/1'
    }

    // Priority 3: Has both but no containers running
    if (statusData.hasDockerCompose && statusData.containerCount === 0) {
      return '/start'
    }

    // Priority 4: Some containers running (partial state)
    if (statusData.containerCount > 0 && projectStatus === 'partial') {
      return '/doctor'
    }

    // Priority 5: All good, show dashboard
    return '/'
  } catch (error) {
    console.error('Error determining target route:', error)
    return '/' // Default to dashboard on error
  }
}

// Check if we're on an init page
export function isInitPage(pathname: string): boolean {
  return pathname.startsWith('/init')
}

// Check if we're on a fullscreen page that shouldn't redirect
export function isFullscreenPage(pathname: string): boolean {
  return (
    ['/login', '/start', '/build'].includes(pathname) ||
    pathname.startsWith('/init')
  )
}

// Check if a redirect is needed from current path to target
export function shouldRedirect(
  currentPath: string,
  targetPath: string,
): boolean {
  // Never redirect if we're already on the target path
  if (currentPath === targetPath) {
    return false
  }

  // Don't redirect from init pages to other init pages (let the wizard handle it)
  if (isInitPage(currentPath) && isInitPage(targetPath)) {
    return false
  }

  // Don't redirect if we're on a fullscreen page and target is similar
  if (isFullscreenPage(currentPath) && currentPath !== '/login') {
    // Allow redirect from /start to / (dashboard) when services are running
    if (currentPath === '/start' && targetPath === '/') {
      return true
    }
    // Allow redirect to /init if project not initialized
    if (targetPath === '/init' || targetPath === '/init/1') {
      return true
    }
    return false
  }

  return true
}
