'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogOut, RotateCcw } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProgressSteps } from './ProgressSteps'

interface StepWrapperProps {
  children: React.ReactNode
}

export function StepWrapper({ children }: StepWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [resetting, _setResetting] = useState(false)
  const [stepValidated, setStepValidated] = useState(false)

  // Validate that prior wizard steps were visited before allowing direct URL access
  useEffect(() => {
    const stepMatch = pathname.match(/\/init\/(\d+)/)
    if (!stepMatch) {
      setStepValidated(true)
      return
    }

    const currentStep = parseInt(stepMatch[1] ?? '0', 10)
    if (currentStep <= 1) {
      setStepValidated(true)
      return
    }

    const stored = localStorage.getItem('wizard_visited_steps')
    const visitedSteps: number[] = stored ? JSON.parse(stored) : []

    // Step 1 must have been visited to access any later step
    if (!visitedSteps.includes(1)) {
      router.replace('/init/1')
      return
    }

    setStepValidated(true)
  }, [pathname, router])

  const handleReset = () => {
    if (
      confirm(
        'Are you sure you want to reset the wizard? This will clear all progress and start over.'
      )
    ) {
      // Clear all wizard state
      localStorage.removeItem('wizard_visited_steps')
      localStorage.removeItem('wizard_environment')
      localStorage.removeItem('wizard_step1_cache')
      // Navigate to reset page which will handle the actual reset
      router.push('/init/reset')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  return (
    <>
      <HeroPattern />

      <div className="relative min-h-screen">
        {/* Action buttons - fixed at top on mobile, inline on desktop */}
        <div className="fixed top-0 right-0 z-50 flex items-center gap-2 p-2 sm:hidden">
          {/* Dark/Light mode toggle */}
          <ThemeToggle />

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-2 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-red-600 px-2 py-1 text-sm font-medium text-white transition hover:bg-red-700 dark:bg-red-500/10 dark:text-red-400 dark:ring-1 dark:ring-red-400/20 dark:ring-inset dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:hover:ring-red-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 pt-12 sm:px-6 sm:pt-8 lg:px-8">
          {/* Header with gradient text and desktop controls */}
          <div className="relative">
            <div className="mb-6 text-center">
              <h1 className="bg-gradient-to-r from-blue-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-5xl/tight dark:from-blue-400 dark:to-white">
                Initial Setup Wizard
              </h1>
              <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
                Configure your nself project in 6 simple steps
              </p>
            </div>

            {/* Desktop controls - positioned beside title */}
            <div className="absolute top-0 right-0 hidden items-center gap-2 sm:flex">
              {/* Dark/Light mode toggle */}
              <ThemeToggle />

              {/* Reset button */}
              <button
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700 dark:bg-red-500/10 dark:text-red-400 dark:ring-1 dark:ring-red-400/20 dark:ring-inset dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:hover:ring-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Progress Steps - no wrapper needed */}
          <ProgressSteps />

          {/* Content Card with better transparency */}
          <div className="group relative mt-6 rounded-2xl bg-white/90 backdrop-blur-sm transition-shadow hover:shadow-md hover:shadow-zinc-900/5 dark:bg-zinc-900/90 dark:hover:shadow-black/5">
            {/* Ring border */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 ring-inset dark:ring-white/10" />

            {/* Content */}
            <div className="relative rounded-2xl p-8">
              <div className="space-y-6">{stepValidated ? children : null}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
