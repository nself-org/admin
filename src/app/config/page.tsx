'use client'

import { Button } from '@/components/Button'
import { PageShell } from '@/components/PageShell'
import { FormSkeleton } from '@/components/skeletons'
import { useAsyncData } from '@/hooks/useAsyncData'
import * as Icons from '@/lib/icons'
import { Suspense, useEffect, useState } from 'react'

interface EnvVariable {
  key: string
  value: string
  defaultValue?: string
  isSecret?: boolean
  source?: 'env' | 'default' | 'override'
  category?: string
  hasChanges?: boolean
}

function ConfigContent() {
  const [saving, setSaving] = useState(false)
  const [environment, setEnvironment] = useState('local')
  const [variables, setVariables] = useState<EnvVariable[]>([])
  const [showSecrets, setShowSecrets] = useState(false)
  const [showDefaults, setShowDefaults] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Use async data hook for non-blocking fetch
  const { data, loading, error, refetch } = useAsyncData<EnvVariable[]>(
    async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      try {
        const res = await fetch(`/api/config/env?env=${environment}&defaults=${showDefaults}`, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data = await res.json()
        if (data.success) {
          return data.data.variables
        } else {
          throw new Error(data.error || 'Failed to fetch variables')
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.')
        }
        throw error
      }
    },
    {
      fetchOnMount: true,
      dependencies: [environment, showDefaults],
    }
  )

  // Update local variables when data changes
  useEffect(() => {
    if (data) {
      setVariables(data)
    }
  }, [data])

  const saveEnvironmentVariables = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/config/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          environment,
          variables,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setHasChanges(false)
        // Refetch to get latest state
        refetch()
      }
    } catch (_error) {
      // Intentionally empty - errors handled by refetch
    } finally {
      setSaving(false)
    }
  }

  const updateVariable = (key: string, value: string) => {
    setVariables((vars) =>
      vars.map((v) =>
        v.key === key ? { ...v, value, hasChanges: true, source: 'env' as const } : v
      )
    )
    setHasChanges(true)
  }

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section)
    } else {
      newCollapsed.add(section)
    }
    setCollapsedSections(newCollapsed)
  }

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const exportEnvironment = () => {
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
  }

  // Filter variables
  const filteredVariables = variables.filter((v) => {
    if (!searchTerm) return true
    return (
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.value?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Group variables by category
  const groupedVariables = filteredVariables.reduce(
    (acc, v) => {
      const cat = v.category || 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(v)
      return acc
    },
    {} as Record<string, EnvVariable[]>
  )

  // Compact variable row component
  function VariableRow({ variable }: { variable: EnvVariable }) {
    const isEditing = editingKey === variable.key
    const displayValue = variable.value || variable.defaultValue || ''
    const hasValue = !!variable.value
    const isUsingDefault = !hasValue && !!variable.defaultValue

    if (isEditing) {
      return (
        <tr className="bg-blue-50 dark:bg-blue-950/20">
          <td className="px-3 py-1 font-mono text-xs">
            {variable.key}
            {variable.isSecret && <Icons.Lock className="ml-1 inline h-3 w-3 text-zinc-400" />}
          </td>
          <td className="px-3 py-1" colSpan={2}>
            <div className="flex items-center gap-1">
              <input
                type={variable.isSecret && !showSecrets ? 'password' : 'text'}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 rounded border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateVariable(variable.key, tempValue)
                    setEditingKey(null)
                  } else if (e.key === 'Escape') {
                    setEditingKey(null)
                  }
                }}
              />
              <button
                onClick={() => {
                  updateVariable(variable.key, tempValue)
                  setEditingKey(null)
                }}
                className="rounded bg-green-500 p-1 text-white hover:bg-green-600"
              >
                <Icons.Check className="h-3 w-3" />
              </button>
              <button
                onClick={() => setEditingKey(null)}
                className="rounded bg-zinc-200 p-1 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                <Icons.X className="h-3 w-3" />
              </button>
            </div>
          </td>
        </tr>
      )
    }

    return (
      <tr
        className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
          variable.hasChanges ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
        }`}
      >
        <td className="px-3 py-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
          {variable.key}
          {variable.isSecret && <Icons.Lock className="ml-1 inline h-3 w-3 text-zinc-400" />}
        </td>
        <td className="px-3 py-1 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`${!hasValue ? 'text-zinc-400 italic' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              {variable.isSecret && !showSecrets
                ? hasValue
                  ? '••••••••'
                  : 'not set'
                : displayValue || 'not set'}
            </span>
            {isUsingDefault && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                default
              </span>
            )}
            {hasValue && !variable.hasChanges && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400">
                set
              </span>
            )}
            {variable.hasChanges && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                modified
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-1 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => copyToClipboard(displayValue)}
              className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Icons.Copy className="h-3 w-3 text-zinc-500" />
            </button>
            <button
              onClick={() => {
                setEditingKey(variable.key)
                setTempValue(variable.value || variable.defaultValue || '')
              }}
              className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Icons.Edit className="h-3 w-3 text-zinc-500" />
            </button>
            {variable.value && (
              <button
                onClick={() => updateVariable(variable.key, '')}
                className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <Icons.Trash2 className="h-3 w-3 text-red-500" />
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  // Actions for the page header
  const actions = (
    <>
      {hasChanges && (
        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Icons.AlertCircle className="h-3 w-3" />
          Unsaved
        </span>
      )}

      <Button variant="outline" onClick={exportEnvironment}>
        <Icons.Download className="h-3 w-3" />
      </Button>

      <Button variant="outline" onClick={refetch}>
        <Icons.RefreshCw className="h-3 w-3" />
      </Button>

      <Button onClick={saveEnvironmentVariables} disabled={!hasChanges || saving}>
        <Icons.Save className="mr-1 h-3 w-3" />
        Save
      </Button>
    </>
  )

  return (
    <PageShell
      description="Manage environment variables across all environments"
      loading={loading}
      error={error}
      actions={actions}
    >
      {/* Controls Bar */}
      <div className="mb-6 rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700">
        <div className="flex flex-wrap items-center gap-3">
          {/* Environment Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
            {['local', 'dev', 'stage', 'prod', 'secrets'].map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  environment === env
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {env.charAt(0).toUpperCase() + env.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
          />

          {/* Toggles */}
          <button
            onClick={() => setShowDefaults(!showDefaults)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              showDefaults
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {showDefaults ? '✓' : ''} Defaults
          </button>

          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {showSecrets ? <Icons.EyeOff className="h-3 w-3" /> : <Icons.Eye className="h-3 w-3" />}
            Secrets
          </button>
        </div>
      </div>

      {/* Variables Table */}
      <div className="space-y-4">
        {variables.length === 0 && !loading ? (
          <div className="rounded-xl bg-zinc-50 p-12 text-center dark:bg-zinc-900/50">
            <Icons.Settings className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-400">No environment variables found</p>
          </div>
        ) : (
          Object.entries(groupedVariables).map(([category, vars]) => {
            const isCollapsed = collapsedSections.has(category)
            const cleanCategory = category.replace(/^\d+\.\s*/, '')

            return (
              <div
                key={category}
                className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700"
              >
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
                  </div>
                </button>

                {!isCollapsed && (
                  <table className="w-full">
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {vars.map((variable) => (
                        <VariableRow key={variable.key} variable={variable} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })
        )}
      </div>
    </PageShell>
  )
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ConfigContent />
    </Suspense>
  )
}
