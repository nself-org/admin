'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProjectStatus {
  success: boolean
  projectState: 'empty' | 'partial' | 'configured' | 'running' | 'unknown'
  needsSetup: boolean
  hasEnvFile: boolean
  hasAdminPassword: boolean
  servicesRunning: boolean
  summary: {
    initialized: boolean
    configured: boolean
    built: boolean
    running: boolean
  }
}

interface ProjectStateWrapperProps {
  children: React.ReactNode
}

const PROJECT_SETUP_KEY = 'nself_project_setup_confirmed'

export function ProjectStateWrapper({ children }: ProjectStateWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null)
  // Start with loading false to avoid blocking page loads
  const [loading, setLoading] = useState(false)
  const [_skipInitialCheck, setSkipInitialCheck] = useState(false)

  useEffect(() => {
    // Only check project status if authenticated
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    // Check if we've previously confirmed the project is set up
    const projectSetupConfirmed = localStorage.getItem(PROJECT_SETUP_KEY)

    if (projectSetupConfirmed === 'true' && !pathname.startsWith('/init')) {
      // Skip initial loading spinner, go straight to the app
      // but still check project status silently in the background
      setSkipInitialCheck(true)
      setLoading(false)
      checkProjectStatusSilently()
    } else if (!projectSetupConfirmed) {
      // First time - need to check and potentially show loading
      setLoading(true)
      checkProjectStatus()
    } else {
      // On setup page or other cases - no loading
      setLoading(false)
      checkProjectStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkProjectStatus and checkProjectStatusSilently are stable within the render cycle; adding them would cause infinite loops (no useCallback wrapping intended by design)
  }, [isAuthenticated])

  const checkProjectStatus = async () => {
    try {
      const response = await fetch('/api/project/status')

      // Skip processing if we get a 401 (not authenticated)
      if (response.status === 401) {
        setLoading(false)
        return
      }

      const status = await response.json()
      setProjectStatus(status)

      // If project is properly set up, remember this
      if (
        status.success &&
        !status.needsSetup &&
        (status.projectState === 'configured' || status.projectState === 'running')
      ) {
        localStorage.setItem(PROJECT_SETUP_KEY, 'true')
      }

      // Only redirect if we're not already on init page and project needs setup
      if (status.success && status.needsSetup && !pathname.startsWith('/init')) {
        localStorage.removeItem(PROJECT_SETUP_KEY) // Clear cached status
        router.push('/init/1') // Start at step 1 of the wizard
        return
      }

      // If project is set up but we're on init page, redirect appropriately
      if (status.success && !status.needsSetup && pathname.startsWith('/init')) {
        // If has docker-compose but no containers, go to /start
        if (status.hasDockerCompose && status.containerCount === 0) {
          router.push('/start')
        } else {
          router.push('/')
        }
        return
      }
    } catch (_error) {
      localStorage.removeItem(PROJECT_SETUP_KEY) // Clear cached status on error
      // On error, assume setup is needed unless we're already on init page
      if (!pathname.startsWith('/init')) {
        router.push('/init/1') // Start at step 1 of the wizard
      }
    } finally {
      setLoading(false)
    }
  }

  const checkProjectStatusSilently = async () => {
    try {
      const response = await fetch('/api/project/status')

      // Skip processing if we get a 401 (not authenticated)
      if (response.status === 401) {
        return
      }

      const status = await response.json()
      setProjectStatus(status)

      // If project is no longer set up, clear cache and redirect appropriately
      // But don't redirect if we're already on an init page
      if (status.success && status.needsSetup && !pathname.startsWith('/init')) {
        localStorage.removeItem(PROJECT_SETUP_KEY)
        router.push('/init/1') // Start at step 1 of the wizard
        return
      }

      // Refresh cache if project is still properly set up
      if (
        status.success &&
        !status.needsSetup &&
        (status.projectState === 'configured' || status.projectState === 'running')
      ) {
        localStorage.setItem(PROJECT_SETUP_KEY, 'true')
      }
    } catch (_error) {
      // On silent check failure, clear cache but don't redirect immediately
      localStorage.removeItem(PROJECT_SETUP_KEY)
    }
  }

  // Show loading spinner while checking project status
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    )
  }

  // If we're on init page, always show init
  if (pathname.startsWith('/init')) {
    return <>{children}</>
  }

  // If project needs setup but we're not on init page, show loading
  // (user should be redirected to init)
  if (projectStatus?.needsSetup) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    )
  }

  // Normal app rendering for configured projects
  return <>{children}</>
}
