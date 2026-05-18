'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProjectStore } from '@/stores/projectStore'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
// import { dockerPollingService } from '@/services/DockerPollingService'
import { simplifiedPolling } from '@/services/SimplifiedPolling'

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  const _pathname = usePathname()
  const projectStatus = useProjectStore((state) => state.projectStatus)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    // NOTE: Centralized polling service fetches data
    // Pages just read from the store - single source of truth

    // Only check project status and start polling if authenticated
    if (isAuthenticated) {
      // Initial project status check
      const store = useProjectStore.getState()
      store.checkProjectStatus().then(() => {
        // After checking status, start polling if running
        const currentState = useProjectStore.getState()
        if (currentState.projectStatus === 'running') {
          simplifiedPolling.start()
        }
      })
    }

    // Cleanup on unmount (app close)
    return () => {
      simplifiedPolling.stop()
    }
  }, [isAuthenticated])

  // React to project status changes
  useEffect(() => {
    // Only manage polling if authenticated
    if (isAuthenticated) {
      if (projectStatus === 'running') {
        simplifiedPolling.start()
      } else {
        simplifiedPolling.stop()
      }
    } else {
      // Stop polling if not authenticated
      simplifiedPolling.stop()
    }
  }, [projectStatus, isAuthenticated])

  // Commented out - pages now handle their own data fetching
  // useEffect(() => {
  //   // Adjust data fetching based on project status
  //   if (projectStatus === 'running') {
  //     // Enable all data sources when running
  //     backgroundDataService.setEnabled('containers', true)
  //     backgroundDataService.setEnabled('containerStats', true)
  //     backgroundDataService.setEnabled('database', true)
  //     backgroundDataService.setEnabled('systemMetrics', true)
  //
  //     // Use fast intervals for responsive UI
  //     if (pathname === '/' || pathname === '/dashboard') {
  //       // Dashboard needs fast updates
  //       backgroundDataService.setInterval('containers', 2000) // Quick status
  //       backgroundDataService.setInterval('containerStats', 10000) // Detailed stats
  //       backgroundDataService.setInterval('systemMetrics', 3000)
  //     } else if (pathname === '/services') {
  //       // Services page needs fast container updates
  //       backgroundDataService.setInterval('containers', 2000)
  //       backgroundDataService.setInterval('containerStats', 10000)
  //       backgroundDataService.setInterval('systemMetrics', 5000)
  //     } else if (pathname === '/database') {
  //       // Database page focuses on DB updates
  //       backgroundDataService.setInterval('database', 3000)
  //       backgroundDataService.setInterval('containers', 5000)
  //       backgroundDataService.setInterval('containerStats', 15000)
  //       backgroundDataService.setInterval('systemMetrics', 10000)
  //     } else {
  //       // Default intervals for other pages
  //       backgroundDataService.setInterval('containers', 5000)
  //       backgroundDataService.setInterval('containerStats', 15000)
  //       backgroundDataService.setInterval('systemMetrics', 10000)
  //       backgroundDataService.setInterval('database', 10000)
  //     }
  //   } else if (projectStatus === 'stopped' || projectStatus === 'not_initialized') {
  //     // Disable most data sources when not running
  //     backgroundDataService.setEnabled('containers', false)
  //     backgroundDataService.setEnabled('containerStats', false)
  //     backgroundDataService.setEnabled('database', false)
  //     backgroundDataService.setEnabled('systemMetrics', false)
  //   }
  // }, [projectStatus, pathname])

  return <>{children}</>
}
