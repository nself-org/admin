'use client'

interface WizardBackupSchedule {
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom'
  time?: string
  dayOfWeek?: number
  dayOfMonth?: number
  customCron?: string
}

interface WizardBackupConfig {
  enabled?: boolean
  types?: {
    database?: boolean
    images?: boolean
    configs?: boolean
  }
  schedule?: WizardBackupSchedule
  retention?: number
  compression?: boolean
  encryption?: boolean
}

interface WizardConfig {
  projectName?: string
  environment?: string
  domain?: string
  databaseName?: string
  databasePassword?: string
  adminEmail?: string
  backup?: WizardBackupConfig
  backupEnabled?: boolean
  backupSchedule?: string
  [key: string]: unknown
}

import { BackupConfiguration } from '@/components/BackupConfiguration'
import { useAutoSave } from '@/hooks/useAutoSave'
import { ArrowRight, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { StepWrapper } from '../StepWrapper'

export default function InitStep1() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [hasLoaded, setHasLoaded] = useState(false)

  // Start with null config - will be loaded from env file
  const [config, setConfig] = useState<WizardConfig | null>(null)

  // Load configuration from env file on mount and when page gains focus
  useEffect(() => {
    loadFromEnv()

    // Reload when the page gains focus (e.g., navigating back)
    const handleFocus = () => {
      loadFromEnv()
    }

    // Also reload when the page becomes visible (handles tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFromEnv()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadFromEnv = async () => {
    try {
      const response = await fetch('/api/env/read')
      if (response.ok) {
        const data = await response.json()
        if (data.env) {
          // Load from env file - this is the source of truth
          setConfig({
            projectName: data.env.PROJECT_NAME || 'my-project',
            environment: data.env.ENV || 'dev',
            domain: data.env.BASE_DOMAIN || 'local.nself.org',
            databaseName: data.env.POSTGRES_DB || 'nself',
            databasePassword:
              data.env.POSTGRES_PASSWORD || 'nself-dev-password',
            adminEmail: data.env.ADMIN_EMAIL || '',
            backup: {
              enabled: data.env.BACKUP_ENABLED === 'true',
              types: {
                database: true,
                images: false,
                configs: false,
              },
              schedule: {
                frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
                time: '02:00',
                dayOfWeek: undefined,
                dayOfMonth: undefined,
                customCron: data.env.BACKUP_SCHEDULE,
              },
              retention: parseInt(data.env.BACKUP_RETENTION_DAYS) || 7,
              compression: data.env.BACKUP_COMPRESSION === 'true',
              encryption: data.env.BACKUP_ENCRYPTION === 'true',
            },
          })
        } else {
          // No env file yet, use defaults
          setConfig({
            projectName: 'my-project',
            environment: 'dev',
            domain: 'local.nself.org',
            databaseName: 'nself',
            databasePassword: 'nself-dev-password',
            adminEmail: '',
            backup: {
              enabled: false,
              types: {
                database: true,
                images: false,
                configs: false,
              },
              schedule: {
                frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
                time: '02:00',
                dayOfWeek: undefined,
                dayOfMonth: undefined,
                customCron: undefined,
              },
              retention: 7,
              compression: true,
              encryption: false,
            },
          })
        }
      }
    } catch (error) {
      console.error('Failed to load from env:', error)
      // On error, use defaults
      setConfig({
        projectName: 'my-project',
        environment: 'dev',
        domain: 'local.nself.org',
        databaseName: 'nself',
        databasePassword: 'nself-dev-password',
        adminEmail: '',
        backup: {
          enabled: false,
          types: {
            database: true,
            images: false,
            configs: false,
          },
          schedule: {
            frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
            time: '02:00',
            dayOfWeek: undefined,
            dayOfMonth: undefined,
            customCron: undefined,
          },
          retention: 7,
          compression: true,
          encryption: false,
        },
      })
    } finally {
      setHasLoaded(true)
    }
  }

  // Auto-save configuration
  const saveConfig = useCallback(async () => {
    // Don't save if config hasn't loaded yet
    if (!config) return

    try {
      // Don't use localStorage - env file is the source of truth

      // Safely build backup schedule with defensive checks
      let backupSchedule = '0 2 * * *' // Default daily at 2am

      if (config.backup?.schedule) {
        const schedule = config.backup.schedule
        const timeParts = schedule.time?.split(':') || ['2', '0']
        const hour = timeParts[0] || '2'
        const minute = timeParts[1] || '0'

        if (schedule.customCron) {
          backupSchedule = schedule.customCron
        } else if (schedule.frequency === 'daily') {
          backupSchedule = `0 ${minute} ${hour} * * *`
        } else if (schedule.frequency === 'weekly') {
          backupSchedule = `0 ${minute} ${hour} * * ${schedule.dayOfWeek || 0}`
        } else if (schedule.frequency === 'monthly') {
          backupSchedule = `0 ${minute} ${hour} ${schedule.dayOfMonth || 1} * *`
        }
      }

      // Convert backup structure to flat env vars for API
      const configToSave = {
        ...config,
        backupEnabled: config.backup?.enabled || false,
        backupSchedule,
      }

      // Save directly to env file
      const response = await fetch('/api/wizard/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configToSave, step: 'initial' }),
      })

      if (!response.ok) {
        throw new Error(
          `Save failed: ${response.status} ${response.statusText}`,
        )
      }

    } catch (error) {
      console.error('Failed to auto-save configuration:', error)
    }
  }, [config])

  // Use auto-save hook (only after initial load from env and when config exists)
  const { saveNow } = useAutoSave(config, {
    onSave: saveConfig,
    enabled: hasLoaded && config !== null,
    delay: 1000, // Save after 1 second of inactivity
  })

  const validateField = (field: string, value: any, currentEnv?: string) => {
    let error = ''
    const env = currentEnv || config?.environment

    switch (field) {
      case 'projectName':
        if (!value || value.length < 3) {
          error = 'Must be at least 3 characters'
        }
        break
      case 'databaseName':
        if (!value || value.length < 3) {
          error = 'Must be at least 3 characters'
        } else if (!/^[a-z][a-z0-9_]*$/.test(value)) {
          error =
            'Must start with letter, use only lowercase, numbers, underscore'
        }
        break
      case 'databasePassword':
        if (!value || value.length < 8) {
          error = 'Must be at least 8 characters'
        }
        break
      case 'domain':
        if (!value) {
          error = 'Base domain is required'
        } else if (env === 'development' || env === 'dev') {
          // Support both for compatibility
          if (
            !value.includes('localhost') &&
            !value.includes('local.nself.org')
          ) {
            error = 'Development requires localhost or local.nself.org'
          }
        }
        break
      case 'adminEmail':
        // Only validate if there's enough content to be meaningful
        if (
          value &&
          value.length >= 3 &&
          !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        ) {
          error = 'Invalid email format'
        }
        break
    }

    return error
  }

  const validateStep = () => {
    const newErrors: any = {}
    const allTouched: any = {}

    // Validate all required fields
    const fieldsToValidate = [
      'projectName',
      'databaseName',
      'databasePassword',
      'domain',
    ]
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, (config as any)[field])
      if (error) {
        newErrors[field] = error
      }
      allTouched[field] = true
    })

    // Validate optional email if provided
    if (config?.adminEmail) {
      const emailError = validateField('adminEmail', config?.adminEmail)
      if (emailError) {
        newErrors.adminEmail = emailError
      }
    }

    setErrors(newErrors)
    setTouched(allTouched)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep()) return

    setLoading(true)
    try {
      // Save immediately before navigating
      await saveNow()
      // Don't set loading to false - let the page transition handle it
      router.push('/init/2')
    } catch (error) {
      console.error('Error saving configuration:', error)
      // Only set loading false on error
      setLoading(false)
    }
  }

  // Show loading skeleton while initial data loads
  if (!hasLoaded || !config) {
    return (
      <StepWrapper>
        <div className="grid grid-cols-2 gap-6">
          {/* Loading skeleton with pulse animation */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"></div>
              <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"></div>
            </div>
          ))}
        </div>
      </StepWrapper>
    )
  }

  return (
    <StepWrapper>
      <div className="grid grid-cols-2 gap-6">
        <div className="relative">
          <input
            type="text"
            id="projectName"
            value={config.projectName}
            onChange={(e) => {
              const value = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
              setConfig({ ...config, projectName: value })
              setTouched({ ...touched, projectName: true })
              const error = validateField('projectName', value)
              setErrors({ ...errors, projectName: error })
            }}
            onBlur={() => setTouched({ ...touched, projectName: true })}
            className={`peer w-full rounded-lg border bg-transparent px-3 pt-5 pb-2 text-sm text-zinc-900 transition-all dark:text-white ${
              touched.projectName && errors.projectName
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
            } focus:ring-opacity-20 focus:ring-2 focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="projectName"
            className={`absolute -top-3 left-2 bg-white/90 px-1 text-xs font-medium transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-400 peer-focus:-top-3 peer-focus:text-xs dark:bg-zinc-900/90 ${
              touched.projectName && errors.projectName
                ? 'text-red-600 peer-focus:text-red-600 dark:text-red-400 dark:peer-focus:text-red-400'
                : 'text-zinc-600 peer-focus:text-blue-600 dark:text-zinc-400 dark:peer-focus:text-blue-400'
            }`}
          >
            Project Name
          </label>
          <div className="h-5">
            {touched.projectName && errors.projectName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.projectName}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <select
            id="environment"
            value={config.environment}
            onChange={(e) => {
              const newEnv = e.target.value
              let newDomain = config.domain

              // Update domain when switching environments
              if (newEnv === 'dev' || newEnv === 'development') {
                // Switching to development - use local.nself.org if current domain isn't valid for dev
                if (
                  config.domain !== 'localhost' &&
                  config.domain !== 'local.nself.org'
                ) {
                  newDomain = 'local.nself.org' // Use nself default domain
                }
              } else if (
                config.environment === 'dev' ||
                config.environment === 'development'
              ) {
                // Switching from development to staging/prod - set a placeholder domain
                newDomain = ''
              }

              setConfig({ ...config, environment: newEnv, domain: newDomain })

              // Revalidate domain when environment changes
              if (touched.domain) {
                const domainError = validateField('domain', newDomain, newEnv)
                setErrors({ ...errors, domain: domainError })
              }
            }}
            className="peer focus:ring-opacity-20 w-full appearance-none rounded-lg border border-zinc-300 bg-transparent px-3 pt-5 pr-10 pb-2 text-sm text-zinc-900 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:text-white"
          >
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="prod">Production</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-[50%] right-3 h-4 w-4 -translate-y-[50%] text-zinc-400" />
          <label
            htmlFor="environment"
            className="absolute -top-3 left-2 bg-white/90 px-1 text-xs font-medium text-zinc-600 transition-all peer-focus:text-blue-600 dark:bg-zinc-900/90 dark:text-zinc-400 dark:peer-focus:text-blue-400"
          >
            Environment
          </label>
        </div>

        <div className="relative">
          <input
            type="text"
            id="databaseName"
            value={config.databaseName}
            onChange={(e) => {
              const value = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '')
              setConfig({ ...config, databaseName: value })
              setTouched({ ...touched, databaseName: true })
              const error = validateField('databaseName', value)
              setErrors({ ...errors, databaseName: error })
            }}
            onBlur={() => setTouched({ ...touched, databaseName: true })}
            className={`peer w-full rounded-lg border bg-transparent px-3 pt-5 pb-2 text-sm text-zinc-900 transition-all dark:text-white ${
              touched.databaseName && errors.databaseName
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
            } focus:ring-opacity-20 focus:ring-2 focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="databaseName"
            className={`absolute -top-3 left-2 bg-white/90 px-1 text-xs font-medium transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-400 peer-focus:-top-3 peer-focus:text-xs dark:bg-zinc-900/90 ${
              touched.databaseName && errors.databaseName
                ? 'text-red-600 peer-focus:text-red-600 dark:text-red-400 dark:peer-focus:text-red-400'
                : 'text-zinc-600 peer-focus:text-blue-600 dark:text-zinc-400 dark:peer-focus:text-blue-400'
            }`}
          >
            Database Name
          </label>
          <div className="h-5">
            {touched.databaseName && errors.databaseName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.databaseName}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="databasePassword"
            value={config.databasePassword}
            onChange={(e) => {
              setConfig({ ...config, databasePassword: e.target.value })
              setTouched({ ...touched, databasePassword: true })
              const error = validateField('databasePassword', e.target.value)
              setErrors({ ...errors, databasePassword: error })
            }}
            onBlur={() => setTouched({ ...touched, databasePassword: true })}
            className={`peer w-full rounded-lg border bg-transparent px-3 pt-5 pr-10 pb-2 text-sm text-zinc-900 transition-all dark:text-white ${
              touched.databasePassword && errors.databasePassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
            } focus:ring-opacity-20 focus:ring-2 focus:outline-none`}
            placeholder=" "
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-[50%] right-3 -translate-y-[50%] text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
          <label
            htmlFor="databasePassword"
            className={`absolute -top-3 left-2 bg-white/90 px-1 text-xs font-medium transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-400 peer-focus:-top-3 peer-focus:text-xs dark:bg-zinc-900/90 ${
              touched.databasePassword && errors.databasePassword
                ? 'text-red-600 peer-focus:text-red-600 dark:text-red-400 dark:peer-focus:text-red-400'
                : 'text-zinc-600 peer-focus:text-blue-600 dark:text-zinc-400 dark:peer-focus:text-blue-400'
            }`}
          >
            Database Password
          </label>
          <div className="h-5">
            {touched.databasePassword && errors.databasePassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.databasePassword}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          {config.environment === 'dev' ||
          config.environment === 'development' ? (
            <>
              <select
                id="domain"
                value={config.domain}
                onChange={(e) => {
                  const value = e.target.value
                  setConfig({ ...config, domain: value })
                  setTouched({ ...touched, domain: true })
                  const error = validateField('domain', value)
                  setErrors({ ...errors, domain: error })
                }}
                onBlur={() => setTouched({ ...touched, domain: true })}
                className={`peer w-full rounded-lg border bg-transparent px-3 pt-5 pr-10 pb-2 text-sm text-zinc-900 transition-all dark:text-white ${
                  touched.domain && errors.domain
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
                } focus:ring-opacity-20 appearance-none focus:ring-2 focus:outline-none`}
              >
                <option value="localhost">localhost</option>
                <option value="local.nself.org">local.nself.org</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-[50%] right-3 h-4 w-4 -translate-y-[50%] text-zinc-400" />
            </>
          ) : (
            <input
              type="text"
              id="domain"
              value={config.domain}
              onChange={(e) => {
                const value = e.target.value.toLowerCase()
                setConfig({ ...config, domain: value })
                setTouched({ ...touched, domain: true })
                const error = validateField('domain', value)
                setErrors({ ...errors, domain: error })
              }}
              onBlur={() => setTouched({ ...touched, domain: true })}
              className={`peer w-full rounded-lg border bg-transparent px-3 pt-5 pr-32 pb-2 text-sm text-zinc-900 transition-all dark:text-white ${
                touched.domain && errors.domain
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
              } focus:ring-opacity-20 focus:ring-2 focus:outline-none`}
              placeholder="mydomain.com"
            />
          )}
          <label
            htmlFor="domain"
            className={`absolute -top-3 left-2 bg-white/90 px-1 text-xs font-medium transition-all dark:bg-zinc-900/90 ${config.environment !== 'dev' && config.environment !== 'development' ? 'peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-400 peer-focus:-top-3 peer-focus:text-xs' : ''} ${
              touched.domain && errors.domain
                ? 'text-red-600 peer-focus:text-red-600 dark:text-red-400 dark:peer-focus:text-red-400'
                : 'text-zinc-600 peer-focus:text-blue-600 dark:text-zinc-400 dark:peer-focus:text-blue-400'
            }`}
          >
            Base Domain
          </label>
          {config.domain && !errors.domain && (
            <span
              className={`pointer-events-none absolute top-[50%] -translate-y-[50%] text-xs text-zinc-500 dark:text-zinc-600 ${
                config.environment === 'dev' ||
                config.environment === 'development'
                  ? 'right-14'
                  : 'right-2'
              }`}
            >
              (i.e., admin.{config.domain})
            </span>
          )}
          <div className="h-5">
            {touched.domain && errors.domain && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.domain}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="email"
            id="adminEmail"
            value={config.adminEmail}
            onChange={(e) => {
              setConfig({ ...config, adminEmail: e.target.value })
              // Only validate on blur or if already touched and has enough characters
              if (touched.adminEmail && e.target.value.length >= 3) {
                const error = validateField('adminEmail', e.target.value)
                setErrors({ ...errors, adminEmail: error })
              } else if (!e.target.value) {
                // Clear error if field is empty (optional field)
                setErrors({ ...errors, adminEmail: '' })
              }
            }}
            onBlur={() => {
              if (config.adminEmail) {
                setTouched({ ...touched, adminEmail: true })
                const error = validateField('adminEmail', config.adminEmail)
                setErrors({ ...errors, adminEmail: error })
              }
            }}
            className={`peer w-full rounded-lg border bg-transparent px-3 pt-5 pr-20 pb-2 text-sm text-zinc-900 transition-all placeholder:text-zinc-500 dark:text-white dark:placeholder:text-zinc-600 ${
              touched.adminEmail && errors.adminEmail
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
            } focus:ring-opacity-20 focus:ring-2 focus:outline-none`}
            placeholder="admin@nself.org"
          />
          <label
            htmlFor="adminEmail"
            className={`absolute -top-3 left-2 bg-white/90 px-1 text-xs font-medium transition-all dark:bg-zinc-900/90 ${
              touched.adminEmail && errors.adminEmail
                ? 'text-red-600 peer-focus:text-red-600 dark:text-red-400 dark:peer-focus:text-red-400'
                : 'text-zinc-600 peer-focus:text-blue-600 dark:text-zinc-400 dark:peer-focus:text-blue-400'
            }`}
          >
            Admin Email
          </label>
          <span className="pointer-events-none absolute top-[50%] right-3 -translate-y-[50%] text-xs text-zinc-500 dark:text-zinc-600">
            Optional
          </span>
          <div className="h-5">
            {touched.adminEmail && errors.adminEmail && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.adminEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Backup Configuration */}
      <div className="pt-2">
        <BackupConfiguration
          value={
            (config.backup as any) ?? {
              enabled: false,
              types: { database: true, images: false, configs: false },
              schedule: { frequency: 'daily', time: '02:00' },
              retention: 7,
              compression: true,
              encryption: false,
            }
          }
          onChange={(backup) =>
            setConfig({ ...config, backup: backup as WizardBackupConfig })
          }
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
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
