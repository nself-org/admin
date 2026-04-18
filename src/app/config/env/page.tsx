'use client'

import { Button } from '@/components/Button'
import { EnvImportExport } from '@/components/config/EnvImportExport'
import { EnvTabBar } from '@/components/config/EnvTabBar'
import { EnvVariableRow } from '@/components/config/EnvVariableRow'
import {
  AccessRole,
  EnvVariable,
  EnvironmentTab,
} from '@/components/config/types'
import { PageShell } from '@/components/PageShell'
import { FormSkeleton } from '@/components/skeletons/FormSkeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { validateEnvVars, type EnvValidationResult } from '@/lib/env-schema'
import * as Icons from '@/lib/icons'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENVIRONMENT_TABS: EnvironmentTab[] = [
  {
    id: 'local',
    label: 'Local',
    file: '.env.local',
    description: 'Personal development settings (gitignored)',
    minRole: 'dev',
  },
  {
    id: 'dev',
    label: 'Dev',
    file: '.env.dev',
    description: 'Shared development settings (committed)',
    minRole: 'dev',
  },
  {
    id: 'stage',
    label: 'Stage',
    file: '.env.stage',
    description: 'Staging server configuration (gitignored)',
    minRole: 'sr_dev',
  },
  {
    id: 'prod',
    label: 'Prod',
    file: '.env.prod',
    description: 'Production server configuration (gitignored)',
    minRole: 'lead_dev',
  },
  {
    id: 'secrets',
    label: 'Secrets',
    file: '.env.secrets',
    description: 'Server-generated secrets (gitignored, never leaves server)',
    minRole: 'lead_dev',
  },
]

const ROLE_HIERARCHY: Record<AccessRole, number> = {
  dev: 0,
  sr_dev: 1,
  lead_dev: 2,
}

function canAccessTab(userRole: AccessRole, tabMinRole: AccessRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[tabMinRole]
}

// LocalStorage keys for auto-save drafts
const STORAGE_PREFIX = 'nself_env_draft_'

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function EnvEditorContent() {
  // State
  const [environment, setEnvironment] = useState('local')
  const [variables, setVariables] = useState<EnvVariable[]>([])
  const [originalVariables, setOriginalVariables] = useState<EnvVariable[]>([])
  const [showSecrets, setShowSecrets] = useState(false)
  const [showDefaults, setShowDefaults] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsSecret, setNewIsSecret] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null)
  const [deletedVariable, setDeletedVariable] = useState<EnvVariable | null>(
    null,
  )
  const [sortColumn, setSortColumn] = useState<'key' | 'value' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [groupBy, setGroupBy] = useState<'category' | 'none'>('category')
  const [rebuildRequired, setRebuildRequired] = useState(false)
  const [showSchemaValidation, setShowSchemaValidation] = useState(false)

  const schemaErrors = useMemo(
    () =>
      validateEnvVars(
        variables.map(({ key, value }) => ({ key, value: value ?? '' })),
      ),
    [variables],
  )

  // Role-based access (in a real app this would come from auth context)
  // Default to lead_dev in development for full access
  const [accessRole] = useState<AccessRole>('lead_dev')

  // Visible tabs based on access role
  const visibleTabs = ENVIRONMENT_TABS.filter((tab) =>
    canAccessTab(accessRole, tab.minRole),
  )

  // Data fetching
  const { data, loading, error, refetch } = useAsyncData<EnvVariable[]>(
    async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const res = await fetch(
          `/api/config/env?env=${environment}&defaults=${showDefaults}`,
          { signal: controller.signal },
        )
        clearTimeout(timeoutId)

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const json = await res.json()
        if (json.success) {
          return json.data.variables
        } else {
          throw new Error(json.error || 'Failed to fetch variables')
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.')
        }
        throw err
      }
    },
    {
      fetchOnMount: true,
      dependencies: [environment, showDefaults],
    },
  )

  // Sync fetched data to local state
  useEffect(() => {
    if (data) {
      // Check for draft in localStorage
      const draftKey = `${STORAGE_PREFIX}${environment}`
      const draft = localStorage.getItem(draftKey)

      if (draft) {
        try {
          const draftVars = JSON.parse(draft)
          setVariables(draftVars)
          setHasChanges(true)
        } catch {
          setVariables(data)
          setOriginalVariables(data)
          setHasChanges(false)
        }
      } else {
        setVariables(data)
        setOriginalVariables(data)
        setHasChanges(false)
      }

      setEditingKey(null)
      setDeleteConfirm(null)
      setRebuildRequired(false)
    }
  }, [data, environment])

  // Auto-save draft to localStorage
  useEffect(() => {
    if (hasChanges) {
      const draftKey = `${STORAGE_PREFIX}${environment}`
      localStorage.setItem(draftKey, JSON.stringify(variables))
    }
  }, [variables, hasChanges, environment])

  // Clear save message after 4 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [saveMessage])

  // Clear delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [deleteConfirm])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const updateVariable = useCallback((key: string, value: string) => {
    setVariables((vars) =>
      vars.map((v) =>
        v.key === key
          ? { ...v, value, hasChanges: true, source: 'env' as const }
          : v,
      ),
    )
    setHasChanges(true)
    setRebuildRequired(true)
  }, [])

  const addVariable = useCallback(() => {
    if (!newKey.trim()) return

    // Check for duplicate keys
    if (variables.some((v) => v.key === newKey.trim().toUpperCase())) {
      setSaveMessage({
        type: 'error',
        text: `Variable ${newKey.trim().toUpperCase()} already exists`,
      })
      return
    }

    const normalizedKey = newKey.trim().toUpperCase()

    // Validate key format
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedKey)) {
      setSaveMessage({
        type: 'error',
        text: 'Invalid variable name. Use only letters, numbers, and underscores.',
      })
      return
    }

    // Add to local state immediately
    const newVar: EnvVariable = {
      key: normalizedKey,
      value: newValue,
      source: 'env',
      hasChanges: true,
      isSecret: newIsSecret,
      description: newDescription,
    }
    setVariables((vars) => [...vars, newVar])
    setHasChanges(true)
    setRebuildRequired(true)
    setNewKey('')
    setNewValue('')
    setNewDescription('')
    setNewIsSecret(false)
    setShowAddForm(false)
  }, [newKey, newValue, newDescription, newIsSecret, variables])

  const deleteVariable = useCallback(
    (key: string) => {
      if (deleteConfirm !== key) {
        setDeleteConfirm(key)
        return
      }

      const varToDelete = variables.find((v) => v.key === key)
      if (!varToDelete) return

      setDeletedVariable(varToDelete)
      setVariables((vars) => vars.filter((v) => v.key !== key))
      setHasChanges(true)
      setRebuildRequired(true)
      setDeleteConfirm(null)

      // Set undo timeout (5 seconds)
      const timeout = setTimeout(() => {
        setDeletedVariable(null)
      }, 5000)
      setUndoTimeout(timeout)
    },
    [deleteConfirm, variables],
  )

  const undoDelete = useCallback(() => {
    if (deletedVariable) {
      setVariables((vars) => [...vars, deletedVariable])
      setDeletedVariable(null)
      if (undoTimeout) {
        clearTimeout(undoTimeout)
        setUndoTimeout(null)
      }
    }
  }, [deletedVariable, undoTimeout])

  const saveEnvironmentVariables = useCallback(async () => {
    try {
      setSaving(true)
      setSaveMessage(null)

      const res = await fetch('/api/config/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          environment,
          variables,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setHasChanges(false)
        setOriginalVariables([...variables])

        // Clear draft from localStorage
        const draftKey = `${STORAGE_PREFIX}${environment}`
        localStorage.removeItem(draftKey)

        const buildNote = json.buildSuccess
          ? ' Build completed successfully.'
          : json.buildTriggered
            ? ' Build was triggered but may need attention.'
            : ''
        setSaveMessage({
          type: 'success',
          text: `Environment saved to .env.${environment}.${buildNote}`,
        })
        setRebuildRequired(false)
      } else {
        setSaveMessage({
          type: 'error',
          text: json.error || 'Failed to save',
        })
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save',
      })
    } finally {
      setSaving(false)
    }
  }, [environment, variables])

  const syncFromCLI = useCallback(async () => {
    setSaveMessage(null)
    await refetch()
    setSaveMessage({ type: 'success', text: 'Synced from file system.' })
  }, [refetch])

  const discardChanges = useCallback(() => {
    setVariables([...originalVariables])
    setHasChanges(false)
    setEditingKey(null)
    setRebuildRequired(false)

    // Clear draft from localStorage
    const draftKey = `${STORAGE_PREFIX}${environment}`
    localStorage.removeItem(draftKey)
  }, [originalVariables, environment])

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  const copyToClipboard = useCallback((value: string) => {
    navigator.clipboard.writeText(value).catch(() => {
      // Clipboard API may fail if page is not focused
    })
  }, [])

  const exportEnvironment = useCallback(() => {
    const envContent = variables
      .filter((v) => v.value)
      .map((v) => `${v.key}=${v.value}`)
      .join('\n')

    const blob = new Blob([envContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `.env.${environment}`
    a.click()
    URL.revokeObjectURL(url)
  }, [variables, environment])

  const importVariables = useCallback(
    (vars: Record<string, string>) => {
      const newVars = [...variables]

      for (const [key, value] of Object.entries(vars)) {
        const existingIndex = newVars.findIndex((v) => v.key === key)
        if (existingIndex >= 0) {
          newVars[existingIndex] = {
            ...newVars[existingIndex],
            value,
            hasChanges: true,
          }
        } else {
          newVars.push({
            key,
            value,
            source: 'env',
            hasChanges: true,
          })
        }
      }

      setVariables(newVars)
      setHasChanges(true)
      setRebuildRequired(true)
      setSaveMessage({
        type: 'success',
        text: `Imported ${Object.keys(vars).length} variables`,
      })
    },
    [variables],
  )

  const copyFromEnvironment = useCallback(
    async (sourceEnv: string) => {
      try {
        const res = await fetch(
          `/api/config/env?env=${sourceEnv}&defaults=false`,
        )
        const json = await res.json()

        if (json.success) {
          const sourceVars: Record<string, string> = {}
          for (const v of json.data.variables) {
            if (v.value) {
              sourceVars[v.key] = v.value
            }
          }
          importVariables(sourceVars)
        }
      } catch (err) {
        setSaveMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to copy variables',
        })
      }
    },
    [importVariables],
  )

  const findReplace = useCallback(
    (find: string, replace: string) => {
      let count = 0
      const updatedVars = variables.map((v) => {
        if (v.value && v.value.includes(find)) {
          count++
          return {
            ...v,
            value: v.value.replace(new RegExp(find, 'g'), replace),
            hasChanges: true,
          }
        }
        return v
      })

      if (count > 0) {
        setVariables(updatedVars)
        setHasChanges(true)
        setRebuildRequired(true)
        setSaveMessage({
          type: 'success',
          text: `Replaced ${count} occurrence${count !== 1 ? 's' : ''}`,
        })
      } else {
        setSaveMessage({
          type: 'error',
          text: 'No matches found',
        })
      }
    },
    [variables],
  )

  const handleSort = useCallback(
    (column: 'key' | 'value') => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
    },
    [sortColumn, sortDirection],
  )

  const handleTabChange = useCallback((tabId: string) => {
    setEnvironment(tabId)
    setSearchTerm('')
    setEditingKey(null)
    setDeleteConfirm(null)
    setShowAddForm(false)
  }, [])

  const triggerRebuild = useCallback(async () => {
    try {
      const res = await fetch('/api/config/build', {
        method: 'POST',
      })
      const json = await res.json()

      if (json.success) {
        setSaveMessage({
          type: 'success',
          text: 'Build completed successfully',
        })
        setRebuildRequired(false)
      } else {
        setSaveMessage({
          type: 'error',
          text: json.error || 'Build failed',
        })
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Build failed',
      })
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filteredVariables = variables.filter((v) => {
    if (!searchTerm) return true
    return (
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Apply sorting
  let sortedVariables = [...filteredVariables]
  if (sortColumn) {
    sortedVariables.sort((a, b) => {
      const aVal = sortColumn === 'key' ? a.key : a.value || ''
      const bVal = sortColumn === 'key' ? b.key : b.value || ''
      const comparison = aVal.localeCompare(bVal)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const groupedVariables =
    groupBy === 'category'
      ? sortedVariables.reduce(
          (acc, v) => {
            const cat = v.category || 'Other'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(v)
            return acc
          },
          {} as Record<string, EnvVariable[]>,
        )
      : { All: sortedVariables }

  const envVarCount = variables.filter(
    (v) => v.source === 'env' && v.value,
  ).length
  const modifiedCount = variables.filter((v) => v.hasChanges).length

  const currentTab = ENVIRONMENT_TABS.find((t) => t.id === environment)

  // ---------------------------------------------------------------------------
  // Header actions
  // ---------------------------------------------------------------------------

  const actions = (
    <>
      {saveMessage && (
        <span
          className={`flex items-center gap-1 text-xs ${
            saveMessage.type === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <Icons.CheckCircle className="h-3 w-3" />
          ) : (
            <Icons.AlertCircle className="h-3 w-3" />
          )}
          {saveMessage.text}
        </span>
      )}

      {hasChanges && (
        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Icons.AlertCircle className="h-3 w-3" />
          {modifiedCount} unsaved
        </span>
      )}

      <EnvImportExport
        environment={environment}
        variables={variables}
        onImport={importVariables}
        onExport={exportEnvironment}
        onCopyFrom={copyFromEnvironment}
        onFindReplace={findReplace}
      />

      <Button variant="outline" onClick={syncFromCLI} title="Sync from file">
        <Icons.RefreshCw className="h-3 w-3" />
      </Button>

      {hasChanges && (
        <Button variant="outline" onClick={discardChanges} title="Discard">
          <Icons.X className="mr-1 h-3 w-3" />
          Discard
        </Button>
      )}

      <Button
        onClick={saveEnvironmentVariables}
        disabled={!hasChanges || saving}
      >
        <Icons.Save className="mr-1 h-3 w-3" />
        {saving ? 'Saving...' : 'Save & Build'}
      </Button>
    </>
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <PageShell
        title="Environment Editor"
        description="Manage environment variables across all environments"
      >
        <FormSkeleton fields={8} />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Environment Editor"
      description="Manage environment variables across all environments"
      error={error}
      actions={actions}
    >
      {/* Rebuild Required Banner */}
      {rebuildRequired && !hasChanges && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200 dark:bg-amber-950/20 dark:ring-amber-800">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Configuration changes require a rebuild
            </span>
          </div>
          <Button onClick={triggerRebuild}>
            <Icons.RefreshCw className="mr-1 h-3 w-3" />
            Rebuild Now
          </Button>
        </div>
      )}

      {/* Undo Delete Banner */}
      {deletedVariable && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-200 dark:bg-blue-950/20 dark:ring-blue-800">
          <div className="flex items-center gap-2">
            <Icons.Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Deleted variable:{' '}
              <span className="font-mono">{deletedVariable.key}</span>
            </span>
          </div>
          <Button variant="outline" onClick={undoDelete}>
            <Icons.RotateCw className="mr-1 h-3 w-3" />
            Undo
          </Button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="mb-6 rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700">
        <div className="flex flex-wrap items-center gap-3">
          {/* Environment Tabs */}
          <EnvTabBar
            tabs={visibleTabs}
            activeTab={environment}
            hasUnsavedChanges={hasChanges}
            onTabChange={handleTabChange}
          />

          {/* Search */}
          <div className="relative">
            <Icons.Search className="absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-44 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pr-3 pl-7 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 right-2 -translate-y-1/2"
              >
                <Icons.X className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />
              </button>
            )}
          </div>

          {/* Toggles */}
          <button
            onClick={() => setShowDefaults(!showDefaults)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              showDefaults
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {showDefaults ? (
              <Icons.Check className="mr-1 inline h-3 w-3" />
            ) : null}
            Defaults
          </button>

          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {showSecrets ? (
              <Icons.EyeOff className="h-3 w-3" />
            ) : (
              <Icons.Eye className="h-3 w-3" />
            )}
            Secrets
          </button>

          <button
            onClick={() =>
              setGroupBy(groupBy === 'category' ? 'none' : 'category')
            }
            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <Icons.Filter className="h-3 w-3" />
            {groupBy === 'category' ? 'Grouped' : 'Flat'}
          </button>

          {/* Add Variable button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              showAddForm
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            <Icons.Plus className="h-3 w-3" />
            Add
          </button>

          {/* Variable count */}
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-500">
            {envVarCount} variable{envVarCount !== 1 ? 's' : ''} set
          </span>
        </div>

        {/* Environment description */}
        {currentTab && (
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            <Icons.FileText className="h-3 w-3" />
            <span className="font-mono">{currentTab.file}</span>
            <span className="text-zinc-400">—</span>
            <span>{currentTab.description}</span>
          </div>
        )}
      </div>

      {/* Add Variable Form */}
      {showAddForm && (
        <div className="mb-4 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200 dark:bg-blue-950/20 dark:ring-blue-800">
          <div className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-300">
            Add New Variable
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="VARIABLE_NAME"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                className="w-48 rounded border border-blue-300 bg-white px-3 py-1.5 font-mono text-xs uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-blue-700 dark:bg-zinc-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addVariable()
                  if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewKey('')
                    setNewValue('')
                    setNewDescription('')
                    setNewIsSecret(false)
                  }
                }}
                autoFocus
              />
              <span className="text-zinc-400">=</span>
              <textarea
                placeholder="value (multiline supported)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-blue-700 dark:bg-zinc-900"
                rows={newValue.split('\n').length || 1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    addVariable()
                  }
                  if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewKey('')
                    setNewValue('')
                    setNewDescription('')
                    setNewIsSecret(false)
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-blue-700 dark:bg-zinc-900"
              />
              <label className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-1.5 text-xs dark:border-blue-700 dark:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={newIsSecret}
                  onChange={(e) => setNewIsSecret(e.target.checked)}
                  className="rounded"
                />
                <Icons.Lock className="h-3 w-3" />
                Secret
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={addVariable} disabled={!newKey.trim()}>
                <Icons.Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setNewKey('')
                  setNewValue('')
                  setNewDescription('')
                  setNewIsSecret(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-blue-700/70 dark:text-blue-400/50">
            Variable names can contain letters, numbers, and underscores. Press
            Enter to add, Escape to cancel.
          </p>
        </div>
      )}

      {/* Schema Validation Panel */}
      {variables.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowSchemaValidation((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
              schemaErrors.length === 0
                ? 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/20 dark:text-green-400 dark:ring-green-800'
                : schemaErrors.some((e) => e.severity === 'error')
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/20 dark:text-red-400 dark:ring-red-800'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:ring-amber-800'
            }`}
          >
            {schemaErrors.length === 0 ? (
              <Icons.CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
            ) : schemaErrors.some((e) => e.severity === 'error') ? (
              <Icons.XCircle className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <Icons.AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="flex-1 text-left">
              {schemaErrors.length === 0
                ? 'Schema validation passed'
                : `${schemaErrors.filter((e) => e.severity === 'error').length} error${schemaErrors.filter((e) => e.severity === 'error').length !== 1 ? 's' : ''}, ${schemaErrors.filter((e) => e.severity === 'warn').length} warning${schemaErrors.filter((e) => e.severity === 'warn').length !== 1 ? 's' : ''}`}
            </span>
            <Icons.ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showSchemaValidation ? 'rotate-180' : ''}`}
            />
          </button>

          {showSchemaValidation && schemaErrors.length > 0 && (
            <div className="mt-1 rounded-t rounded-b-xl border border-t-0 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">
                      Variable
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">
                      Issue
                    </th>
                    <th className="w-20 px-4 py-2 text-left font-medium text-zinc-500">
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schemaErrors.map((err: EnvValidationResult, i: number) => (
                    <tr
                      key={`${err.key}-${i}`}
                      className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50"
                    >
                      <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                        {err.key}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {err.message}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            err.severity === 'error'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {err.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Variables Table */}
      <div className="space-y-4">
        {filteredVariables.length === 0 && !loading ? (
          <div className="rounded-xl bg-zinc-50 p-12 text-center dark:bg-zinc-900/50">
            <Icons.Settings className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-400">
              {searchTerm
                ? `No variables matching "${searchTerm}"`
                : 'No environment variables found'}
            </p>
            {!searchTerm && (
              <p className="mt-2 text-sm text-zinc-500">
                Click &quot;Add&quot; to create a new variable, or enable
                &quot;Defaults&quot; to see available settings.
              </p>
            )}
          </div>
        ) : (
          Object.entries(groupedVariables)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, vars]) => {
              const isCollapsed = collapsedSections.has(category)
              const cleanCategory = category.replace(/^\d+\.\s*/, '')
              const categoryModified = vars.filter((v) => v.hasChanges).length

              return (
                <div
                  key={category}
                  className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700"
                >
                  {groupBy === 'category' && (
                    <button
                      onClick={() => toggleSection(category)}
                      className="flex w-full items-center justify-between bg-zinc-50 px-4 py-2 transition-colors hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <Icons.ChevronRight className="h-4 w-4" />
                        ) : (
                          <Icons.ChevronDown className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {cleanCategory}
                        </span>
                        <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
                          {vars.length}
                        </span>
                        {categoryModified > 0 && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {categoryModified} modified
                          </span>
                        )}
                      </div>
                    </button>
                  )}{' '}
                  {!isCollapsed && (
                    <>
                      {/* Desktop: Table */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                          <thead className="border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                              <th
                                className="cursor-pointer px-3 py-2 text-left text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                                onClick={() => handleSort('key')}
                              >
                                <div className="flex items-center gap-1">
                                  Key
                                  {sortColumn === 'key' && (
                                    <span>
                                      {sortDirection === 'asc' ? (
                                        <Icons.ArrowUp className="h-3 w-3" />
                                      ) : (
                                        <Icons.ArrowDown className="h-3 w-3" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th
                                className="cursor-pointer px-3 py-2 text-left text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                                onClick={() => handleSort('value')}
                              >
                                <div className="flex items-center gap-1">
                                  Value
                                  {sortColumn === 'value' && (
                                    <span>
                                      {sortDirection === 'asc' ? (
                                        <Icons.ArrowUp className="h-3 w-3" />
                                      ) : (
                                        <Icons.ArrowDown className="h-3 w-3" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {vars.map((variable) => (
                              <EnvVariableRow
                                key={variable.key}
                                variable={variable}
                                editingKey={editingKey}
                                tempValue={tempValue}
                                showSecrets={showSecrets}
                                deleteConfirm={deleteConfirm}
                                onSetEditingKey={setEditingKey}
                                onSetTempValue={setTempValue}
                                onUpdateVariable={updateVariable}
                                onDeleteVariable={deleteVariable}
                                onCopyToClipboard={copyToClipboard}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: Cards */}
                      <div className="space-y-3 md:hidden">
                        {vars.map((variable) => {
                          const isEditing = editingKey === variable.key
                          const displayValue =
                            variable.value || variable.defaultValue || ''
                          const isConfirmingDelete =
                            deleteConfirm === variable.key

                          return (
                            <div
                              key={variable.key}
                              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium text-zinc-900 dark:text-white">
                                      {variable.key}
                                    </span>
                                    {variable.isSecret && (
                                      <Icons.Lock className="h-3 w-3 text-zinc-400" />
                                    )}
                                  </div>
                                  {variable.description && (
                                    <div className="text-xs text-zinc-500">
                                      {variable.description}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-2 flex gap-1">
                                  <button
                                    onClick={() =>
                                      copyToClipboard(displayValue)
                                    }
                                    className="rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    title="Copy value"
                                  >
                                    <Icons.Copy className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingKey(variable.key)
                                      setTempValue(displayValue)
                                    }}
                                    className="rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    title="Edit"
                                  >
                                    <Icons.Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteVariable(variable.key)}
                                    className={`rounded p-2 ${
                                      isConfirmingDelete
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/20'
                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                    }`}
                                    title={
                                      isConfirmingDelete
                                        ? 'Click again to confirm'
                                        : 'Delete'
                                    }
                                  >
                                    <Icons.Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={tempValue}
                                    onChange={(e) =>
                                      setTempValue(e.target.value)
                                    }
                                    className="w-full rounded border border-zinc-200 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                    rows={3}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        updateVariable(variable.key, tempValue)
                                        setEditingKey(null)
                                      } else if (e.key === 'Escape') {
                                        setEditingKey(null)
                                      }
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        updateVariable(variable.key, tempValue)
                                        setEditingKey(null)
                                      }}
                                      className="flex items-center gap-1 rounded bg-green-500 px-3 py-1.5 text-xs text-white hover:bg-green-600"
                                    >
                                      <Icons.Check className="h-3 w-3" />
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingKey(null)}
                                      className="flex items-center gap-1 rounded bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                                    >
                                      <Icons.X className="h-3 w-3" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                                  {variable.isSecret && !showSecrets ? (
                                    <span className="text-zinc-400">
                                      ••••••••
                                    </span>
                                  ) : displayValue ? (
                                    <div className="break-all">
                                      {displayValue}
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 italic">
                                      not set
                                    </span>
                                  )}
                                </div>
                              )}

                              {(variable.source ||
                                variable.hasChanges ||
                                variable.isSecret) && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {variable.source && (
                                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                      {variable.source}
                                    </span>
                                  )}
                                  {variable.hasChanges && (
                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                      modified
                                    </span>
                                  )}
                                  {variable.defaultValue && !variable.value && (
                                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                      using default
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })
        )}
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="fixed right-6 bottom-6 left-auto z-50 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 shadow-lg ring-1 ring-amber-200 dark:bg-amber-950/80 dark:ring-amber-800">
          <Icons.AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {modifiedCount} unsaved change{modifiedCount !== 1 ? 's' : ''}
          </span>
          <Button variant="outline" onClick={discardChanges}>
            Discard
          </Button>
          <Button onClick={saveEnvironmentVariables} disabled={saving}>
            <Icons.Save className="mr-1 h-3 w-3" />
            {saving ? 'Saving...' : 'Save & Build'}
          </Button>
        </div>
      )}
    </PageShell>
  )
}

export default function EnvEditorPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EnvEditorContent />
    </Suspense>
  )
}
