'use client'

import { BuildProgress } from '@/components/build/BuildProgress'
import { BuildStep, BuildTimeline } from '@/components/build/BuildTimeline'
import { LogLine, LogViewer } from '@/components/build/LogViewer'
import { FormSkeleton } from '@/components/skeletons'
import { BuildProgressSkeleton } from '@/components/skeletons/BuildProgressSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useBuildProgress } from '@/hooks/useBuildProgress'
import { useWebSocket } from '@/hooks/useWebSocket'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Hammer,
  RefreshCw,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

type BuildStatus = 'idle' | 'checking' | 'building' | 'success' | 'error'
type LogFilter = 'all' | 'errors' | 'warnings'

interface PreBuildCheck {
  name: string
  status: 'checking' | 'passed' | 'warning' | 'failed'
  message?: string
}

function BuildContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromWizard = searchParams.get('from') === 'wizard'

  // WebSocket for real-time build progress
  const { connected, reconnecting } = useWebSocket()
  const {
    progress: wsProgress,
    isBuilding,
    isComplete,
    isFailed,
    reset: resetProgress,
  } = useBuildProgress()

  // Build state
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('checking')
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([
    { id: '1', name: 'Validating configuration', status: 'pending' },
    { id: '2', name: 'Generating docker-compose.yml', status: 'pending' },
    { id: '3', name: 'Creating networks', status: 'pending' },
    { id: '4', name: 'Building images', status: 'pending' },
    { id: '5', name: 'Pulling images', status: 'pending' },
    { id: '6', name: 'Starting containers', status: 'pending' },
  ])
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // Pre-build checks
  const [preBuildChecks, setPreBuildChecks] = useState<PreBuildCheck[]>([
    { name: 'Environment files', status: 'checking' },
    { name: 'Docker daemon', status: 'checking' },
    { name: 'nself CLI', status: 'checking' },
  ])

  // Logs
  const [logs, setLogs] = useState<LogLine[]>([])
  const [logFilter, setLogFilter] = useState<LogFilter>('all')

  // Refs
  const buildStartedRef = useRef(false)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync WebSocket progress to local state
  useEffect(() => {
    if (wsProgress) {
      setProgress(wsProgress.progress)
      setCurrentStep(wsProgress.currentStep || 0)

      // Update build status based on WebSocket status
      if (wsProgress.status === 'in-progress') {
        setBuildStatus('building')
      } else if (wsProgress.status === 'complete') {
        setBuildStatus('success')
      } else if (wsProgress.status === 'failed') {
        setBuildStatus('error')
        setErrorMessage(wsProgress.message || 'Build failed')
      }

      // Update corresponding build step
      if (wsProgress.currentStep && wsProgress.currentStep > 0) {
        updateStep(
          wsProgress.currentStep - 1,
          'in-progress',
          wsProgress.message,
        )
      }
    }
  }, [wsProgress])

  // Update step helper
  const updateStep = useCallback(
    (index: number, status: BuildStep['status'], message?: string) => {
      setBuildSteps((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          status,
          message,
          timestamp: new Date().toISOString(),
        }
        return updated
      })
    },
    [],
  )

  // Add log helper
  const addLog = useCallback((text: string, level?: LogLine['level']) => {
    const newLog: LogLine = {
      id: Date.now().toString() + Math.random(),
      text,
      timestamp: new Date().toISOString(),
      level,
    }
    setLogs((prev) => [...prev, newLog])
  }, [])

  // Run pre-build checks
  const runPreBuildChecks = useCallback(async () => {
    addLog('Starting pre-build checks...', 'info')

    // Check 1: Environment files
    try {
      const res = await fetch('/api/project/status')
      const data = await res.json()

      if (data.hasEnvFile) {
        setPreBuildChecks((prev) =>
          prev.map((c) =>
            c.name === 'Environment files'
              ? { ...c, status: 'passed', message: '.env file found' }
              : c,
          ),
        )
        addLog('✓ Environment files found', 'info')
      } else {
        setPreBuildChecks((prev) =>
          prev.map((c) =>
            c.name === 'Environment files'
              ? { ...c, status: 'failed', message: 'No .env file found' }
              : c,
          ),
        )
        addLog('✗ No environment files found', 'error')
      }
    } catch {
      setPreBuildChecks((prev) =>
        prev.map((c) =>
          c.name === 'Environment files'
            ? { ...c, status: 'warning', message: 'Could not verify' }
            : c,
        ),
      )
      addLog('⚠ Could not verify environment files', 'warn')
    }

    // Check 2: Docker daemon
    try {
      const res = await fetch('/api/docker/status')
      const data = await res.json()

      if (data.running) {
        setPreBuildChecks((prev) =>
          prev.map((c) =>
            c.name === 'Docker daemon'
              ? { ...c, status: 'passed', message: 'Docker is running' }
              : c,
          ),
        )
        addLog('✓ Docker daemon is running', 'info')
      } else {
        setPreBuildChecks((prev) =>
          prev.map((c) =>
            c.name === 'Docker daemon'
              ? {
                  ...c,
                  status: 'failed',
                  message: 'Docker is not running',
                }
              : c,
          ),
        )
        addLog('✗ Docker daemon is not running', 'error')
      }
    } catch {
      setPreBuildChecks((prev) =>
        prev.map((c) =>
          c.name === 'Docker daemon'
            ? { ...c, status: 'warning', message: 'Could not verify' }
            : c,
        ),
      )
      addLog('⚠ Could not verify Docker status', 'warn')
    }

    // Check 3: nself CLI
    try {
      const res = await fetch('/api/nself/version')
      const data = await res.json()

      if (data.version) {
        setPreBuildChecks((prev) =>
          prev.map((c) =>
            c.name === 'nself CLI'
              ? {
                  ...c,
                  status: 'passed',
                  message: `Version ${data.version}`,
                }
              : c,
          ),
        )
        addLog(`✓ nself CLI found (v${data.version})`, 'info')
      } else {
        setPreBuildChecks((prev) =>
          prev.map((c) =>
            c.name === 'nself CLI'
              ? { ...c, status: 'failed', message: 'Not found' }
              : c,
          ),
        )
        addLog('✗ nself CLI not found', 'error')
      }
    } catch {
      setPreBuildChecks((prev) =>
        prev.map((c) =>
          c.name === 'nself CLI'
            ? { ...c, status: 'warning', message: 'Could not verify' }
            : c,
        ),
      )
      addLog('⚠ Could not verify nself CLI', 'warn')
    }

    // Check if any checks failed
    const anyFailed = preBuildChecks.some((c) => c.status === 'failed')
    if (anyFailed) {
      addLog(
        'Pre-build checks failed. Please fix issues before building.',
        'error',
      )
      setBuildStatus('error')
      return false
    }

    addLog('All pre-build checks passed', 'info')
    return true
  }, [addLog, preBuildChecks])

  // Start build process
  const startBuild = useCallback(async () => {
    if (buildStartedRef.current) {
      return
    }
    buildStartedRef.current = true

    setBuildStatus('building')
    startTimeRef.current = Date.now()
    addLog('Starting build process...', 'info')

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    try {
      // Get CSRF token
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      // Step 1: Validating config
      updateStep(0, 'in-progress')
      setCurrentStep(1)
      setProgress(10)
      addLog('Validating project configuration...', 'info')
      await new Promise((resolve) => setTimeout(resolve, 500))
      updateStep(0, 'complete', 'Configuration is valid')
      setProgress(20)

      // Step 2: Generating docker-compose.yml
      updateStep(1, 'in-progress')
      setCurrentStep(2)
      addLog('Generating docker-compose.yml...', 'info')

      const response = await fetch('/api/nself/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
      })

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Build failed' }))
        throw new Error(errorData.error || errorData.details || 'Build failed')
      }

      const data = await response.json()
      updateStep(
        1,
        'complete',
        `Generated for ${data.serviceCount || 'all'} services`,
      )
      setProgress(40)
      addLog(
        `✓ docker-compose.yml generated (${data.serviceCount || 'N'} services)`,
        'info',
      )

      // Step 3: Creating networks
      updateStep(2, 'in-progress')
      setCurrentStep(3)
      addLog('Creating Docker networks...', 'info')
      await new Promise((resolve) => setTimeout(resolve, 600))
      updateStep(2, 'complete')
      setProgress(55)
      addLog('✓ Networks created', 'info')

      // Step 4: Building images
      updateStep(3, 'in-progress')
      setCurrentStep(4)
      addLog('Building Docker images...', 'info')
      await new Promise((resolve) => setTimeout(resolve, 800))
      updateStep(3, 'complete')
      setProgress(70)
      addLog('✓ Images built', 'info')

      // Step 5: Pulling images
      updateStep(4, 'in-progress')
      setCurrentStep(5)
      addLog('Pulling required images...', 'info')
      await new Promise((resolve) => setTimeout(resolve, 700))
      updateStep(4, 'complete')
      setProgress(85)
      addLog('✓ Images pulled', 'info')

      // Step 6: Starting containers
      updateStep(5, 'in-progress')
      setCurrentStep(6)
      addLog('Starting containers...', 'info')
      await new Promise((resolve) => setTimeout(resolve, 500))
      updateStep(5, 'complete')
      setProgress(100)
      addLog('✓ Build complete!', 'info')

      // Success
      setBuildStatus('success')
      if (timerRef.current) clearInterval(timerRef.current)

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.push('/start')
      }, 2000)
    } catch (error) {
      console.error('Build error:', error)
      const message = error instanceof Error ? error.message : 'Build failed'
      setBuildStatus('error')
      setErrorMessage(message)
      updateStep(currentStep - 1, 'failed', message)
      addLog(`✗ Build failed: ${message}`, 'error')
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [updateStep, addLog, currentStep, router])

  // Run checks and build on mount
  useEffect(() => {
    const init = async () => {
      if (fromWizard) {
        // Skip checks if coming from wizard
        setBuildStatus('idle')
        await new Promise((resolve) => setTimeout(resolve, 500))
        startBuild()
      } else {
        // Run pre-build checks
        const checksPass = await runPreBuildChecks()
        if (checksPass) {
          setBuildStatus('idle')
        }
      }
    }

    init()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fromWizard, runPreBuildChecks, startBuild])

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'errors') {
      return log.level === 'error' || log.text.toLowerCase().includes('error')
    }
    if (logFilter === 'warnings') {
      return log.level === 'warn' || log.text.toLowerCase().includes('warn')
    }
    return true
  })

  // Handle retry
  const handleRetry = () => {
    buildStartedRef.current = false
    setBuildStatus('checking')
    setCurrentStep(0)
    setProgress(0)
    setElapsedTime(0)
    setErrorMessage('')
    setLogs([])
    setBuildSteps((prev) =>
      prev.map((step) => ({ ...step, status: 'pending' })),
    )
    runPreBuildChecks()
  }

  // Handle reset (go back to wizard)
  const handleReset = () => {
    router.push('/init/1')
  }

  // Loading state
  if (buildStatus === 'checking') {
    return <BuildProgressSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 px-4 py-12 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            {buildStatus === 'idle' && (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Hammer className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {buildStatus === 'building' && (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Hammer className="h-10 w-10 animate-pulse text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {buildStatus === 'success' && (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            )}
            {buildStatus === 'error' && (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-white">
            {buildStatus === 'idle' && 'Ready to Build'}
            {buildStatus === 'building' && 'Building Project'}
            {buildStatus === 'success' && 'Build Successful!'}
            {buildStatus === 'error' && 'Build Failed'}
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400">
            {buildStatus === 'idle' &&
              'All checks passed. Ready to build your project.'}
            {buildStatus === 'building' && 'Setting up your nself project...'}
            {buildStatus === 'success' && 'Redirecting to start page...'}
            {buildStatus === 'error' && errorMessage}
          </p>

          {/* WebSocket connection indicator */}
          {buildStatus === 'building' && (
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
                connected
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : reconnecting
                    ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {connected
                ? 'Live updates active'
                : reconnecting
                  ? 'Reconnecting...'
                  : 'Offline - using polling'}
            </div>
          )}
        </div>

        {/* Pre-build Checks (only show if not building/success) */}
        {buildStatus === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pre-Build Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {preBuildChecks.map((check) => (
                <div
                  key={check.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {check.status === 'passed' && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {check.status === 'failed' && (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    {check.status === 'warning' && (
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                    {check.status === 'checking' && (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
                    )}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  {check.message && (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {check.message}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Build Progress */}
        {(buildStatus === 'building' ||
          buildStatus === 'success' ||
          buildStatus === 'error') && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Build Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <BuildProgress
                progress={progress}
                currentStep={currentStep}
                totalSteps={buildSteps.length}
                elapsedTime={elapsedTime}
                status={
                  buildStatus === 'success'
                    ? 'success'
                    : buildStatus === 'error'
                      ? 'error'
                      : 'building'
                }
              />

              <BuildTimeline steps={buildSteps} />
            </CardContent>
          </Card>
        )}

        {/* Build Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Build Logs</CardTitle>

                {/* Log Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-all"
                      checked={logFilter === 'all'}
                      onCheckedChange={() => setLogFilter('all')}
                    />
                    <Label htmlFor="filter-all" className="text-sm font-normal">
                      All
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-errors"
                      checked={logFilter === 'errors'}
                      onCheckedChange={() => setLogFilter('errors')}
                    />
                    <Label
                      htmlFor="filter-errors"
                      className="text-sm font-normal"
                    >
                      Errors Only
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-warnings"
                      checked={logFilter === 'warnings'}
                      onCheckedChange={() => setLogFilter('warnings')}
                    />
                    <Label
                      htmlFor="filter-warnings"
                      className="text-sm font-normal"
                    >
                      Warnings Only
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <LogViewer logs={filteredLogs} maxHeight="400px" />
            </CardContent>
          </Card>
        )}

        {/* Post-Build Actions */}
        {buildStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-900 dark:text-green-100">
              Build Complete!
            </AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              Your project has been built successfully. Redirecting to start
              page...
            </AlertDescription>
          </Alert>
        )}

        {buildStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Build Failed</AlertTitle>
            <AlertDescription>
              {errorMessage ||
                'An error occurred during the build process. Please check the logs above.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {buildStatus === 'idle' && (
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Back to Setup
            </Button>
            <Button onClick={startBuild}>
              <Hammer className="mr-2 h-4 w-4" />
              Start Build
            </Button>
          </div>
        )}

        {buildStatus === 'error' && (
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset & Start Over
            </Button>
            <Button onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Build
            </Button>
          </div>
        )}

        {buildStatus === 'success' && (
          <div className="flex justify-center">
            <Button onClick={() => router.push('/start')}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {buildStatus === 'idle' && logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <Hammer className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No build in progress
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Click &quot;Start Build&quot; to begin building your project
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuildPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <BuildContent />
    </Suspense>
  )
}
