'use client'

import { CheckCircle, Code, Database, Layers, Package, Rocket, Settings } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const steps = [
  { number: 1, name: 'Basic Settings', icon: Settings, path: '/init/1' },
  { number: 2, name: 'Core Services', icon: Database, path: '/init/2' },
  { number: 3, name: 'Optional Services', icon: Package, path: '/init/3' },
  { number: 4, name: 'Custom Services', icon: Code, path: '/init/4' },
  { number: 5, name: 'Frontend Apps', icon: Layers, path: '/init/5' },
  { number: 6, name: 'Review & Build', icon: Rocket, path: '/init/6' },
]

export function ProgressSteps() {
  const pathname = usePathname()
  const router = useRouter()
  const currentStep = steps.findIndex((s) => s.path === pathname) + 1
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set())

  // Load visited steps from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('wizard_visited_steps')
    if (stored) {
      setVisitedSteps(new Set(JSON.parse(stored)))
    }
  }, [])

  // Track current step as visited
  useEffect(() => {
    if (currentStep > 0) {
      setVisitedSteps((prev) => {
        const newSet = new Set(prev)
        newSet.add(currentStep)
        localStorage.setItem('wizard_visited_steps', JSON.stringify(Array.from(newSet)))
        return newSet
      })
    }
  }, [currentStep])

  const handleStepClick = (step: (typeof steps)[0]) => {
    if (visitedSteps.has(step.number) || step.number === currentStep) {
      router.push(step.path)
    }
  }

  // Calculate progress percentage for the line
  const maxVisitedStep = Math.max(...Array.from(visitedSteps), 0)
  const progressPercentage =
    maxVisitedStep > 1 ? ((maxVisitedStep - 1) / (steps.length - 1)) * 100 : 0

  return (
    <div className="mb-4 w-full py-4">
      <div className="relative">
        {/* Line container with padding to offset from edges */}
        <div className="absolute inset-x-7 top-5">
          {/* Background line */}
          <div className="h-[2px] w-full bg-zinc-200 dark:bg-zinc-700" />

          {/* Progress line */}
          <div
            className="absolute top-0 left-0 h-[2px] bg-blue-600 transition-all duration-500 dark:bg-blue-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = step.number === currentStep
            const isPastDone = visitedSteps.has(step.number) && step.number < currentStep
            const isFutureDone = visitedSteps.has(step.number) && step.number > currentStep
            const _isNotVisited = !visitedSteps.has(step.number) && !isActive
            // Make all steps up to the max visited step clickable
            const isClickable = step.number <= maxVisitedStep || isActive

            return (
              <button
                key={step.number}
                onClick={() => handleStepClick(step)}
                disabled={!isClickable}
                className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'} `}
              >
                {/* Circle */}
                <div
                  className={`relative z-10 flex h-10 w-10 transform-gpu items-center justify-center rounded-full transition-all duration-300 ease-in-out ${
                    isActive
                      ? 'scale-125 bg-gradient-to-br from-blue-400 to-blue-600 shadow-xl ring-4 shadow-blue-500/25 ring-blue-300 dark:from-blue-400 dark:to-blue-600 dark:shadow-blue-400/25 dark:ring-blue-400/50'
                      : isPastDone
                        ? 'scale-100 transform bg-blue-800 shadow-md dark:bg-blue-700'
                        : isFutureDone
                          ? 'scale-100 transform border-2 border-zinc-400 bg-blue-900 shadow-md hover:scale-105 dark:border-zinc-500 dark:bg-blue-950'
                          : 'scale-100 transform border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'
                  } `}
                >
                  {isPastDone ? (
                    <CheckCircle className="h-5 w-5 text-white transition-colors duration-300" />
                  ) : (
                    <Icon
                      className={`h-5 w-5 transition-colors duration-300 ${isActive || isPastDone || isFutureDone ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'} `}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-xs whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'font-bold text-blue-700 dark:text-blue-300'
                      : isPastDone
                        ? 'font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                        : isFutureDone
                          ? 'font-medium text-blue-800 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300'
                          : 'font-medium text-zinc-500 dark:text-zinc-400'
                  } `}
                >
                  {step.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
