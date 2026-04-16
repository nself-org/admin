'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ListSkeleton } from '@/components/skeletons'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface Environment {
  name: string
  type: 'local' | 'staging' | 'production' | 'custom'
  hasEnv: boolean
  hasSecrets: boolean
  hasServer: boolean
  serverConfig?: {
    host?: string
    user?: string
    deployPath?: string
  }
  isCurrent: boolean
}

interface ActionResult {
  success: boolean
  output?: string
  error?: string
}

function EnvironmentsContent() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  const [projectPath, setProjectPath] = useState<string>('')

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvTemplate, setNewEnvTemplate] = useState<
    'local' | 'staging' | 'prod'
  >('local')

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await fetch('/api/env')
      const data = await response.json()

      if (data.success) {
        setEnvironments(data.environments || [])
        setProjectPath(data.projectPath || '')
      }
    } catch (error) {
      console.error('Failed to fetch environments:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEnvironments()
  }, [fetchEnvironments])

  const executeAction = async (
    action: string,
    options: Record<string, unknown> = {},
  ) => {
    setActionLoading(action)
    setActionResult(null)

    try {
      const response = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...options }),
      })
      const data = await response.json()

      setActionResult({
        success: data.success,
        output: data.output,
        error: data.error || data.details,
      })

      if (data.success) {
        fetchEnvironments()
      }
    } catch (error) {
      setActionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await executeAction('create', {
      name: newEnvName,
      template: newEnvTemplate,
    })
    setShowCreateForm(false)
    setNewEnvName('')
    setNewEnvTemplate('local')
  }

  const getTypeColor = (type: Environment['type']) => {
    switch (type) {
      case 'local':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'staging':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'production':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  const getTypeIcon = (type: Environment['type']) => {
    switch (type) {
      case 'local':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )
      case 'staging':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        )
      case 'production':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        )
      default:
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
                Environments
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Manage deployment environments for local, staging, and
                production
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Environment
            </button>
          </div>
        </div>

        {/* Project Path */}
        {projectPath && (
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Project:</span>{' '}
              <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono dark:bg-zinc-700">
                {projectPath}
              </code>
            </p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Create New Environment
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Environment Name *
                  </label>
                  <input
                    type="text"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    placeholder="my-environment"
                    pattern="[a-z0-9-]+"
                    required
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Template
                  </label>
                  <select
                    value={newEnvTemplate}
                    onChange={(e) =>
                      setNewEnvTemplate(
                        e.target.value as 'local' | 'staging' | 'prod',
                      )
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="local">Local (Development)</option>
                    <option value="staging">Staging</option>
                    <option value="prod">Production</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!newEnvName || actionLoading === 'create'}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'create'
                    ? 'Creating...'
                    : 'Create Environment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Action Result */}
        {actionResult && (
          <div
            className={`mb-8 rounded-xl border p-6 ${actionResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}
          >
            <div className="flex items-start gap-3">
              {actionResult.success ? (
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${actionResult.success ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}
                >
                  {actionResult.success ? 'Success' : 'Error'}
                </p>
                {(actionResult.output || actionResult.error) && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm whitespace-pre-wrap text-zinc-100">
                    {actionResult.output || actionResult.error}
                  </pre>
                )}
              </div>
              <button
                onClick={() => setActionResult(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Environment List */}
        {environments.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700">
              <svg
                className="h-8 w-8 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No Environments Found
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Create your first environment to get started with
              multi-environment deployment.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create First Environment
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {environments.map((env) => (
              <div
                key={env.name}
                className={`rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-800 ${
                  env.isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${getTypeColor(env.type)}`}
                    >
                      {getTypeIcon(env.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {env.name}
                      </h3>
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${getTypeColor(env.type)}`}
                      >
                        {env.type}
                      </span>
                    </div>
                  </div>
                  {env.isCurrent && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Active
                    </span>
                  )}
                </div>

                {/* Status Indicators */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`h-2 w-2 rounded-full ${env.hasEnv ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      .env file
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`h-2 w-2 rounded-full ${env.hasSecrets ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      .env.secrets
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`h-2 w-2 rounded-full ${env.hasServer ? 'bg-green-500' : 'bg-zinc-300'}`}
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      server.json
                    </span>
                  </div>
                </div>

                {/* Server Config */}
                {env.serverConfig?.host && (
                  <div className="mb-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                    <p className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                      {env.serverConfig.user}@{env.serverConfig.host}
                    </p>
                    {env.serverConfig.deployPath && (
                      <p className="mt-1 font-mono text-xs text-zinc-500">
                        {env.serverConfig.deployPath}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!env.isCurrent && (
                    <button
                      onClick={() =>
                        executeAction('switch', { name: env.name })
                      }
                      disabled={actionLoading !== null}
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {actionLoading === `switch-${env.name}`
                        ? 'Switching...'
                        : 'Switch'}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      executeAction('validate', { name: env.name })
                    }
                    disabled={actionLoading !== null}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Validate
                  </button>
                  {env.type !== 'local' && !env.isCurrent && (
                    <button
                      onClick={() =>
                        executeAction('delete', { name: env.name, force: true })
                      }
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself env list</span> - List all
              environments
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself env create</span>{' '}
              &lt;name&gt; [template] - Create environment
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself env switch</span>{' '}
              &lt;name&gt; - Switch to environment
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself env status</span> - Show
              current environment status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself env diff</span> &lt;env1&gt;
              &lt;env2&gt; - Compare environments
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself env validate</span> [name] -
              Validate environment config
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function EnvironmentsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EnvironmentsContent />
    </Suspense>
  )
}
