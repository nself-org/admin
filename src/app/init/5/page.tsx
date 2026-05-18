'use client'

import { UrlInput } from '@/components/UrlInput'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Globe,
  Info,
  Plus,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { StepWrapper } from '../StepWrapper'

interface FrontendApp {
  displayName: string // Human readable name e.g. "To Do Tracker"
  systemName: string // System name without spaces e.g. "todo_tracker"
  tablePrefix: string // Database table prefix e.g. "tbt"
  localPort: number // Local dev port e.g. 3002 (REQUIRED for nginx routing)
  localSubdomain?: string // Local subdomain e.g. "todo" -> todo.localhost
  productionUrl?: string // Production URL e.g. "www.mytodos.com"
  productionUrlError?: string // Validation error for production URL
  remoteSchemaName?: string // Hasura remote schema name
  remoteSchemaUrl?: string // Remote schema URL for this environment
  remoteSchemaUrlError?: string // Validation error for remote schema URL
}

export default function InitStep5() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [frontendApps, setFrontendApps] = useState<FrontendApp[]>([])
  const [environment, setEnvironment] = useState('development')
  const [baseDomain, setBaseDomain] = useState('localhost')
  const [autoSaving, setAutoSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState<number | null>(null)
  const [showInfoBox, setShowInfoBox] = useState(false)

  const checkAndLoadConfiguration = useCallback(async () => {
    // First check if env file exists
    try {
      const statusRes = await fetch('/api/project/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (!statusData.hasEnvFile) {
          // No env file - redirect to /init to create it
          router.push('/init')
          return
        }
      }
    } catch (error) {
      console.error('Error checking project status:', error)
    }

    // Load configuration if env file exists
    loadConfiguration()
  }, [router])

  // Load configuration from .env.local on mount and when page gains focus
  useEffect(() => {
    checkAndLoadConfiguration()

    // Reload when the page gains focus (e.g., navigating back)
    const handleFocus = () => {
      checkAndLoadConfiguration()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkAndLoadConfiguration()
      }
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkAndLoadConfiguration])

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/wizard/init')
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          if (data.config.frontendApps) {
            setFrontendApps(data.config.frontendApps)
          }
          if (data.config.environment || data.config.ENV) {
            setEnvironment(data.config.environment || data.config.ENV)
          }
          if (data.config.domain || data.config.BASE_DOMAIN) {
            setBaseDomain(data.config.domain || data.config.BASE_DOMAIN)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
    } finally {
      setDataLoaded(true)
    }
  }

  // Auto-save whenever frontendApps changes
  useEffect(() => {
    // Skip if data hasn't been loaded yet
    if (!dataLoaded) return

    // Skip initial empty state
    const isInitialLoad = frontendApps.length === 0
    if (isInitialLoad) return

    const saveApps = async () => {
      setAutoSaving(true)
      try {
        await fetch('/api/wizard/update-frontend-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontendApps, environment }),
        })
      } catch (error) {
        console.error('Error auto-saving frontend apps:', error)
      } finally {
        setAutoSaving(false)
      }
    }

    // Debounce the save
    const timer = setTimeout(saveApps, 500)
    return () => clearTimeout(timer)
  }, [frontendApps, environment, dataLoaded])

  const addApp = () => {
    const nextPort =
      frontendApps.length > 0 ? Math.max(...frontendApps.map((a) => a.localPort)) + 1 : 3001

    const appNum = frontendApps.length + 1
    const displayName = `App ${appNum}`
    const systemName = `app_${appNum}`
    const tablePrefix = `app${appNum}`
    const devUrl = `app${appNum}`
    const remoteSchemaUrl = `api.app${appNum}`

    setFrontendApps([
      ...frontendApps,
      {
        displayName,
        systemName,
        tablePrefix,
        localPort: nextPort, // Always include port for routing
        productionUrl: devUrl, // This will be the subdomain in dev, full domain in prod
        remoteSchemaName: `${tablePrefix}_schema`,
        remoteSchemaUrl,
      },
    ])

    // Automatically focus on the new app's title to show it's editable
    setTimeout(() => {
      setEditingTitle(frontendApps.length)
    }, 50)
  }

  const removeApp = (index: number) => {
    setFrontendApps(frontendApps.filter((_, i) => i !== index))
  }

  const updateApp = (index: number, field: keyof FrontendApp, value: any) => {
    const updated = [...frontendApps]
    if (field === 'systemName' && typeof value === 'string') {
      // Sanitize system name - lowercase, alphanumeric and underscore only, no spaces
      value = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    }
    if (field === 'tablePrefix' && typeof value === 'string') {
      // Sanitize table prefix - lowercase, alphanumeric and underscore only
      value = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    }
    if (field === 'localSubdomain' && typeof value === 'string') {
      // Sanitize subdomain - lowercase, alphanumeric and dash only
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    }
    updated[index] = { ...updated[index], [field]: value }
    setFrontendApps(updated)
  }

  const handleNext = async () => {
    setLoading(true)
    try {
      // Ensure final save before moving on
      await fetch('/api/wizard/update-frontend-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontendApps, environment }),
      })

      // Don't set loading to false - let the page transition handle it
      router.push('/init/6')
    } catch (error) {
      console.error('Error saving configuration:', error)
      // Only set loading false on error
      setLoading(false)
    }
  }

  const handleBack = async () => {
    setLoading(true)
    try {
      // Ensure final save before moving back
      await fetch('/api/wizard/update-frontend-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontendApps, environment }),
      })

      // Don't set loading to false - let the page transition handle it
      router.push('/init/4')
    } catch (error) {
      console.error('Error saving configuration:', error)
      // Only set loading false on error
      setLoading(false)
    }
  }

  // Show loading skeleton while initial data loads
  if (!dataLoaded) {
    return (
      <StepWrapper>
        <div className="space-y-4">
          {/* Info box skeleton */}
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-start gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
              <div className="flex-1">
                <div className="mb-2 h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"></div>
                <div className="mt-1 h-3 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"></div>
              </div>
            </div>
          </div>

          {/* App card skeletons */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                  <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                </div>
                <div className="h-8 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
              </div>

              {/* Input row skeletons */}
              <div className="mb-3 grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j}>
                    <div className="mb-1 h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                    <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"></div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_, j) => (
                  <div key={j}>
                    <div className="mb-1 h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
                    <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add button skeleton */}
          <div className="flex justify-start">
            <div className="h-8 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
          </div>
        </div>
      </StepWrapper>
    )
  }

  return (
    <StepWrapper>
      {/* Info Box - Collapsible */}
      <div className="mb-6">
        <button
          onClick={() => setShowInfoBox(!showInfoBox)}
          className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100/70 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Frontend Apps Configuration
            </span>
            {autoSaving && (
              <span className="text-xs text-blue-600 dark:text-blue-400">(Auto-saving...)</span>
            )}
          </div>
          {showInfoBox ? (
            <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
        </button>

        {showInfoBox && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="space-y-3 text-xs text-blue-700 dark:text-blue-400">
              <p>
                Configure external frontend applications that will consume your nself backend. Each
                app gets its own table namespace, nginx routing, and optional Hasura remote schema.
              </p>

              <div>
                <p className="mb-1 font-medium text-blue-900 dark:text-blue-200">
                  Features per Frontend App:
                </p>
                <ul className="ml-4 space-y-0.5">
                  <li>
                    • <strong>Table Namespace:</strong> Isolated database tables with prefix
                  </li>
                  <li>
                    • <strong>Nginx Routing:</strong> Automatic subdomain configuration
                  </li>
                  <li>
                    • <strong>Local Port:</strong> Development server port assignment
                  </li>
                  <li>
                    • <strong>Remote Schema:</strong> Optional GraphQL endpoint for Hasura
                    integration
                  </li>
                </ul>
              </div>

              <p className="text-xs italic">Changes are saved automatically as you type.</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {frontendApps.map((app, index) => (
          <div
            key={index}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                {editingTitle === index ? (
                  <input
                    type="text"
                    value={app.displayName}
                    onChange={(e) => {
                      updateApp(index, 'displayName', e.target.value)
                      // Auto-generate system name from display name if it hasn't been manually edited
                      const autoSystemName = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-z0-9_]/g, '')
                      if (
                        app.systemName ===
                        app.displayName
                          .toLowerCase()
                          .replace(/\s+/g, '_')
                          .replace(/[^a-z0-9_]/g, '')
                      ) {
                        updateApp(index, 'systemName', autoSystemName)
                      }
                    }}
                    onBlur={() => setEditingTitle(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingTitle(null)
                      }
                    }}
                    className="border-b border-zinc-400 bg-transparent font-medium text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:text-white"
                    autoFocus
                  />
                ) : (
                  <h3
                    className="cursor-pointer font-medium text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                    onClick={() => setEditingTitle(index)}
                  >
                    {app.displayName}
                  </h3>
                )}
              </div>
              <button
                onClick={() => removeApp(index)}
                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Row 1: System Name, Table Prefix, Local Port */}
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  System Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={app.systemName || ''}
                  onChange={(e) => updateApp(index, 'systemName', e.target.value)}
                  className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  placeholder="todo_tracker"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">
                  No spaces, lowercase only
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Table Prefix <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={app.tablePrefix}
                  onChange={(e) => updateApp(index, 'tablePrefix', e.target.value)}
                  className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  placeholder="app"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Local Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={app.localPort}
                  onChange={(e) => {
                    const port = parseInt(e.target.value)
                    if (!isNaN(port) && port >= 3000 && port <= 9999) {
                      updateApp(index, 'localPort', port)
                    }
                  }}
                  className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  placeholder="3001"
                  min="3000"
                  max="9999"
                  required
                />
              </div>
            </div>

            {/* Row 2: Dev URL and Remote Schema URL */}
            <div className="grid grid-cols-2 gap-3">
              {/* Dev/Production URL (for nginx routing) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <ExternalLink className="mr-1 inline h-3 w-3" />
                  {environment === 'development' || environment === 'dev'
                    ? 'Dev'
                    : 'Production'}{' '}
                  URL
                </label>
                <UrlInput
                  value={app.productionUrl || ''}
                  onChange={(value) => updateApp(index, 'productionUrl', value)}
                  onError={(error) => updateApp(index, 'productionUrlError', error)}
                  environment={environment}
                  baseDomain={baseDomain}
                  placeholder={`app${index + 1}`}
                  required={false}
                />
                {app.localPort &&
                  app.productionUrl &&
                  (environment === 'development' || environment === 'dev') && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">
                      Routes localhost:{app.localPort} → {app.productionUrl}.{baseDomain}
                    </p>
                  )}
              </div>

              {/* Remote Schema URL (for Hasura) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Database className="mr-1 inline h-3 w-3" />
                  Custom GraphQL Endpoint{' '}
                  <span className="font-normal text-zinc-500 dark:text-zinc-600">
                    (Hasura Remote Schema)
                  </span>
                </label>
                <UrlInput
                  value={app.remoteSchemaUrl || ''}
                  onChange={(value) => updateApp(index, 'remoteSchemaUrl', value)}
                  onError={(error) => updateApp(index, 'remoteSchemaUrlError', error)}
                  environment={environment}
                  baseDomain={baseDomain}
                  placeholder="api"
                  required={false}
                />
                {app.remoteSchemaUrl && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">
                    Hasura remote schema: {app.tablePrefix || 'app'}_schema
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {frontendApps.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-zinc-300 py-8 text-center dark:border-zinc-700">
            <Globe className="mx-auto mb-3 h-12 w-12 text-zinc-400" />
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">No frontend apps configured yet</p>
            <button
              onClick={addApp}
              className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-1 dark:ring-blue-400/20 dark:ring-inset dark:hover:bg-blue-400/10 dark:hover:text-blue-300 dark:hover:ring-blue-300"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First App</span>
            </button>
          </div>
        )}
      </div>

      {frontendApps.length > 0 && (
        <button
          onClick={addApp}
          className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
        >
          <Plus className="h-4 w-4" />
          <span>Add App</span>
        </button>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-400/20 dark:ring-inset dark:hover:bg-zinc-400/10 dark:hover:text-zinc-300 dark:hover:ring-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="inline-flex cursor-pointer items-center justify-center gap-0.5 overflow-hidden rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-1 dark:ring-blue-400/20 dark:ring-inset dark:hover:bg-blue-400/10 dark:hover:text-blue-300 dark:hover:ring-blue-300"
        >
          {loading ? (
            <>
              <span>Saving</span>
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white dark:border-blue-400"></div>
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </StepWrapper>
  )
}
