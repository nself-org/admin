'use client'

import { ProjectSetupWizard } from '@/components/ProjectSetupWizard'
import { useProjectStore } from '@/stores/projectStore'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

interface ProjectStateProviderProps {
  children: React.ReactNode
}

export function ProjectStateProvider({ children }: ProjectStateProviderProps) {
  const { projectSetup, projectStatus, isChecking, checkProjectStatus, stopBackgroundRefresh } =
    useProjectStore()

  useEffect(() => {
    // Initial check
    checkProjectStatus()

    // NOTE: BackgroundDataService handles all data fetching
    // We don't start the store's background refresh anymore

    // Cleanup on unmount
    return () => {
      stopBackgroundRefresh()
    }
  }, [checkProjectStatus, stopBackgroundRefresh])

  useEffect(() => {
    // NOTE: BackgroundDataService handles all data fetching
    // We don't need the store's background refresh
    // Just stop it if it's running
    stopBackgroundRefresh()
  }, [projectStatus, projectSetup, stopBackgroundRefresh])

  // Show loading state during initial check
  if (isChecking && projectStatus === 'not_initialized') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <h2 className="mb-2 text-xl font-semibold">Checking project status...</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Analyzing your nself project configuration
          </p>
        </motion.div>
      </div>
    )
  }

  // Show setup wizard if project is not setup
  if (!projectSetup && projectStatus !== 'running') {
    return (
      <div className="min-h-screen p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ProjectSetupWizard />
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // Show main app content
  return (
    <AnimatePresence mode="wait">
      <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
