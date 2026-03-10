'use client'

/**
 * Plugin Config Editor — /plugins/[name]/config
 * Renders a form for all plugin env vars (from plugin.json manifest).
 * Reads current values from /api/plugins/[name]/config (GET).
 * Saves via /api/plugins/[name]/config (PUT).
 * Secret values are masked in the UI.
 */

import { ArrowLeft, Eye, EyeOff, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Env var keys that contain secrets — mask value in form inputs
const SECRET_PATTERNS = [
  'key',
  'secret',
  'token',
  'password',
  'passwd',
  'api_key',
  'apikey',
]

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SECRET_PATTERNS.some((p) => lower.includes(p))
}

interface ConfigEntry {
  key: string
  value: string
  description?: string
  required?: boolean
}

interface ConfigResponse {
  success: boolean
  config?: {
    pluginName: string
    envVars?: Record<string, string>
    settings?: Record<string, unknown>
  }
}

interface PluginResponse {
  success: boolean
  plugin?: {
    name: string
    version?: string
    description?: string
  }
}

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 pr-10 font-mono text-sm text-white focus:border-indigo-500 focus:outline-none"
        aria-label={id}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-white"
        aria-label={show ? 'Hide value' : 'Show value'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function ConfigField({
  entry,
  onChange,
}: {
  entry: ConfigEntry
  onChange: (key: string, value: string) => void
}) {
  const isSecret = isSecretKey(entry.key)

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor={`field-${entry.key}`}
          className="font-mono text-sm font-medium text-white"
        >
          {entry.key}
          {entry.required && (
            <span className="ml-1 text-red-400" aria-label="required">
              *
            </span>
          )}
        </label>
        {isSecret && (
          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
            secret
          </span>
        )}
      </div>

      {entry.description && (
        <p className="mb-2 text-xs text-zinc-500">{entry.description}</p>
      )}

      {isSecret ? (
        <SecretInput
          id={`field-${entry.key}`}
          value={entry.value}
          onChange={(v) => onChange(entry.key, v)}
          placeholder={`Enter ${entry.key}...`}
        />
      ) : (
        <input
          id={`field-${entry.key}`}
          type="text"
          value={entry.value}
          onChange={(e) => onChange(entry.key, e.target.value)}
          placeholder={`Enter ${entry.key}...`}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-indigo-500 focus:outline-none"
          aria-label={entry.key}
        />
      )}
    </div>
  )
}

export default function PluginConfigPage() {
  const params = useParams()
  const pluginName = params.name as string

  const [fields, setFields] = useState<ConfigEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: configData, isLoading: configLoading } = useSWR<ConfigResponse>(
    `/api/plugins/${pluginName}/config`,
    fetcher,
  )

  const { data: pluginData } = useSWR<PluginResponse>(
    `/api/plugins/${pluginName}`,
    fetcher,
  )

  // Merge manifest env vars with saved values
  useEffect(() => {
    if (!configData?.success) return

    const saved = configData.config?.envVars ?? {}
    const settings = configData.config?.settings ?? {}

    // Combine envVars and settings into a flat list of fields
    const combined: ConfigEntry[] = []

    for (const [key, value] of Object.entries(saved)) {
      combined.push({ key, value: String(value), required: true })
    }

    // Add any settings keys not already in envVars
    for (const [key, value] of Object.entries(settings)) {
      if (!combined.find((f) => f.key === key)) {
        combined.push({ key, value: String(value) })
      }
    }

    setFields(combined)
  }, [configData])

  const handleChange = (key: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)))
  }

  const handleAddField = () => {
    const key = prompt('Environment variable name (e.g. PLUGIN_AI_API_KEY):')
    if (!key) return
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      alert(
        'Invalid variable name. Use only letters, numbers, and underscores.',
      )
      return
    }
    setFields((prev) => [...prev, { key, value: '', required: false }])
  }

  const handleRemoveField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const envVars: Record<string, string> = {}
      for (const field of fields) {
        envVars[field.key] = field.value
      }

      const response = await fetch(`/api/plugins/${pluginName}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envVars }),
      })

      const result = await response.json()
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setSaveError(result.error || 'Failed to save configuration')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href={`/plugins/${pluginName}`}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            aria-label="Back to plugin"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white capitalize">
              Configure {pluginName}
            </h1>
            {pluginData?.plugin?.version && (
              <p className="text-sm text-zinc-500">
                v{pluginData.plugin.version}
              </p>
            )}
          </div>
        </div>

        {/* Status messages */}
        {saveSuccess && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
          >
            Configuration saved. Apply with:{' '}
            <code className="font-mono">nself build && nself restart</code>
          </div>
        )}
        {saveError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {saveError}
          </div>
        )}

        {/* Config fields */}
        {configLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-zinc-800/50"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-8 text-center">
            <p className="text-zinc-400">No configuration variables found.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add variables using the button below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key} className="relative">
                <ConfigField entry={field} onChange={handleChange} />
                <button
                  type="button"
                  onClick={() => handleRemoveField(field.key)}
                  className="absolute top-3 right-3 text-xs text-zinc-600 hover:text-red-400"
                  aria-label={`Remove ${field.key}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddField}
            className="text-sm text-zinc-400 hover:text-indigo-400"
          >
            + Add variable
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || configLoading}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            aria-label="Save configuration"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Changes take effect after{' '}
          <code className="font-mono">nself build && nself restart</code>
        </p>
      </div>
    </div>
  )
}
