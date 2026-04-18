'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectEntry } from './types'

// ---------------------------------------------------------------------------
// Env badge config
// ---------------------------------------------------------------------------

interface EnvBadgeConfig {
  label: string
  badgeClass: string
  dotClass: string
}

const ENV_BADGE: Record<'local' | 'staging' | 'prod', EnvBadgeConfig> = {
  local: {
    label: 'Local',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-400',
  },
  staging: {
    label: 'Staging',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  prod: {
    label: 'Production',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    dotClass: 'bg-red-500',
  },
}

// ---------------------------------------------------------------------------
// Add-project form
// ---------------------------------------------------------------------------

interface AddProjectFormProps {
  onAdd: (name: string, projectPath: string) => Promise<void>
  onCancel: () => void
  loading: boolean
}

function AddProjectForm({ onAdd, onCancel, loading }: AddProjectFormProps) {
  const [name, setName] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const trimmedName = name.trim()
    const trimmedPath = projectPath.trim()

    if (trimmedName.length === 0) {
      setFormError('Project name is required.')
      return
    }
    if (!/^[a-zA-Z0-9_-]{1,63}$/.test(trimmedName)) {
      setFormError(
        'Name must be 1–63 characters: letters, digits, hyphens, underscores.',
      )
      return
    }
    if (trimmedPath.length === 0) {
      setFormError('Project path is required.')
      return
    }

    try {
      await onAdd(trimmedName, trimmedPath)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to add project.',
      )
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="border-nself-border bg-nself-bg/60 mt-3 rounded-lg border p-3"
    >
      <p className="text-nself-text-muted mb-2 text-xs font-semibold tracking-widest uppercase">
        Register Project
      </p>

      {/* Name field */}
      <div className="mb-2">
        <label
          htmlFor="pp-name"
          className="text-nself-text-muted mb-1 block text-xs font-medium"
        >
          Display name
        </label>
        <input
          ref={nameRef}
          id="pp-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-app"
          maxLength={63}
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Path field */}
      <div className="mb-3">
        <label
          htmlFor="pp-path"
          className="text-nself-text-muted mb-1 block text-xs font-medium"
        >
          Absolute path
        </label>
        <input
          id="pp-path"
          type="text"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          placeholder="/home/user/projects/my-app"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-sm focus:ring-1 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Form error */}
      {formError !== null && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{formError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-nself-primary hover:bg-nself-primary-dark flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Remove confirmation inline prompt
// ---------------------------------------------------------------------------

interface RemoveConfirmProps {
  project: ProjectEntry
  onConfirm: () => void
  onCancel: () => void
}

function RemoveConfirm({ project, onConfirm, onCancel }: RemoveConfirmProps) {
  return (
    <div className="mx-3 my-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
      <p className="mb-2 text-xs text-red-300">
        Remove <span className="font-semibold">{project.name}</span>?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border-nself-border text-nself-text-muted hover:text-nself-text rounded border px-2 py-0.5 text-xs transition-colors"
        >
          Keep
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ProjectPickerProps {
  /** Called after the active project changes. */
  onSelect?: (project: ProjectEntry) => void
}

export function ProjectPicker({ onSelect }: ProjectPickerProps) {
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // Load project list on mount
  // ---------------------------------------------------------------------------

  const loadProjectList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/project')
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const data = (await res.json()) as {
        projects: ProjectEntry[]
        activeProjectId: string | null
      }
      setProjects(data.projects)
      setActiveProjectId(data.activeProjectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjectList()
  }, [loadProjectList])

  // ---------------------------------------------------------------------------
  // Close dropdown on outside click
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current !== null &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
        setShowAddForm(false)
        setPendingRemoveId(null)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // ---------------------------------------------------------------------------
  // Select project
  // ---------------------------------------------------------------------------

  async function handleSelect(id: string) {
    if (id === activeProjectId) {
      setDropdownOpen(false)
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/project/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = (await res.json()) as {
        project?: ProjectEntry
        error?: string
        details?: string
      }
      if (!res.ok) {
        throw new Error(
          data.details ?? data.error ?? 'Failed to select project.',
        )
      }
      if (data.project !== undefined) {
        setActiveProjectId(id)
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, lastUsedAt: data.project!.lastUsedAt } : p,
          ),
        )
        onSelect?.(data.project)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select project.')
    } finally {
      setActionLoading(false)
      setDropdownOpen(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Add project
  // ---------------------------------------------------------------------------

  async function handleAdd(name: string, projectPath: string) {
    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, path: projectPath }),
      })
      const data = (await res.json()) as {
        project?: ProjectEntry
        error?: string
        details?: string
      }
      if (!res.ok) {
        throw new Error(data.details ?? data.error ?? 'Failed to add project.')
      }
      if (data.project !== undefined) {
        setProjects((prev) => [...prev, data.project!])
        setShowAddForm(false)
      }
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Remove project
  // ---------------------------------------------------------------------------

  async function handleRemoveConfirm(id: string) {
    setPendingRemoveId(null)
    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/project/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; details?: string }
        throw new Error(
          data.details ?? data.error ?? 'Failed to remove project.',
        )
      }
      setProjects((prev) => prev.filter((p) => p.id !== id))
      if (activeProjectId === id) {
        setActiveProjectId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove project.')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="glass-card p-4">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
          Active Project
        </span>
        {(loading || actionLoading) && (
          <Loader2 className="text-nself-primary h-4 w-4 animate-spin" />
        )}
      </div>

      {/* Trigger row */}
      <div className="flex items-center gap-3" ref={dropdownRef}>
        {/* Active project indicator */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FolderOpen className="text-nself-primary h-4 w-4 flex-shrink-0" />
          <span
            className="text-nself-text truncate text-sm font-semibold"
            title={activeProject?.path}
          >
            {activeProject !== null
              ? activeProject.name
              : 'No project selected'}
          </span>
          {activeProject !== null && (
            <span
              className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${ENV_BADGE[activeProject.activeEnv].badgeClass}`}
            >
              {ENV_BADGE[activeProject.activeEnv].label}
            </span>
          )}
        </div>

        {/* Dropdown trigger */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setDropdownOpen((o) => !o)
              if (dropdownOpen) {
                setShowAddForm(false)
                setPendingRemoveId(null)
              }
            }}
            disabled={loading || actionLoading}
            className="border-nself-border text-nself-text hover:border-nself-primary hover:bg-nself-primary/10 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-label="Switch project"
          >
            Switch
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div
              className="glass-card-elevated absolute top-full right-0 z-30 mt-1 w-72 overflow-hidden py-1"
              role="listbox"
              aria-label="Select project"
            >
              {projects.length === 0 && !showAddForm ? (
                <p className="text-nself-text-muted px-3 py-2 text-xs">
                  No projects registered yet.
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = project.id === activeProjectId
                  const isPendingRemove = project.id === pendingRemoveId
                  const envCfg = ENV_BADGE[project.activeEnv]

                  return (
                    <div key={project.id}>
                      <div
                        className={`flex w-full items-center gap-2.5 px-3 py-2 transition-colors ${
                          isActive
                            ? 'text-nself-text-muted cursor-default'
                            : 'text-nself-text hover:bg-nself-primary/10 cursor-pointer'
                        }`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          if (!isActive) {
                            handleSelect(project.id)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (!isActive) {
                              handleSelect(project.id)
                            }
                          }
                        }}
                        tabIndex={isActive ? -1 : 0}
                      >
                        {/* Env dot */}
                        <span
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${envCfg.dotClass}`}
                        />
                        {/* Project name + path */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm leading-none font-medium">
                            {project.name}
                          </p>
                          <p className="text-nself-text-muted mt-0.5 truncate font-mono text-xs">
                            {project.path}
                          </p>
                        </div>
                        {/* Active checkmark */}
                        {isActive && (
                          <CheckCircle2 className="text-nself-primary ml-auto h-3.5 w-3.5 flex-shrink-0" />
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPendingRemoveId(
                              project.id === pendingRemoveId
                                ? null
                                : project.id,
                            )
                          }}
                          className="text-nself-text-muted ml-1 flex-shrink-0 rounded p-0.5 transition-colors hover:bg-red-500/15 hover:text-red-400"
                          aria-label={`Remove project ${project.name}`}
                          title="Remove project"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Inline remove confirmation */}
                      {isPendingRemove && (
                        <RemoveConfirm
                          project={project}
                          onConfirm={() => handleRemoveConfirm(project.id)}
                          onCancel={() => setPendingRemoveId(null)}
                        />
                      )}
                    </div>
                  )
                })
              )}

              {/* Divider */}
              <div className="border-nself-border mx-3 my-1 border-t" />

              {/* Add project toggle */}
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-nself-text-muted hover:bg-nself-primary/10 hover:text-nself-primary flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add project
                </button>
              ) : (
                <div className="px-1 pb-1">
                  <AddProjectForm
                    onAdd={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                    loading={actionLoading}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error !== null && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
