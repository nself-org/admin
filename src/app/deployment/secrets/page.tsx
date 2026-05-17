'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface Secret {
  id: string
  key: string
  value: string
  environment: string
  createdAt: string
  lastRotated?: string
}

const EMPTY_SECRETS: Secret[] = []

function SecretsManagementContent() {
  const [selectedEnv, setSelectedEnv] = useState('production')
  const [secrets, setSecrets] = useState<Secret[]>(EMPTY_SECRETS)
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [actionResult, setActionResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const filteredSecrets = secrets.filter((s) => s.environment === selectedEnv)

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setActionResult({ success: true, message: 'Copied to clipboard' })
    setTimeout(() => setActionResult(null), 3000)
  }

  const handleAddSecret = () => {
    if (!newKey || !newValue) return

    const newSecret: Secret = {
      id: Date.now().toString(),
      key: newKey,
      value: newValue,
      environment: selectedEnv,
      createdAt: new Date().toISOString(),
    }

    setSecrets([...secrets, newSecret])
    setNewKey('')
    setNewValue('')
    setShowAddForm(false)
    setActionResult({ success: true, message: 'Secret added successfully' })
    setTimeout(() => setActionResult(null), 3000)
  }

  const handleDeleteSecret = (id: string) => {
    setSecrets(secrets.filter((s) => s.id !== id))
    setActionResult({ success: true, message: 'Secret deleted successfully' })
    setTimeout(() => setActionResult(null), 3000)
  }

  const handleRotateAll = async () => {
    setActionResult({ success: true, message: 'Rotating all secrets...' })
    // Simulate rotation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setActionResult({
      success: true,
      message: 'All secrets rotated successfully',
    })
    setTimeout(() => setActionResult(null), 3000)
  }

  const handleGenerate = async () => {
    setActionResult({ success: true, message: 'Generating secrets...' })
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setActionResult({
      success: true,
      message: 'Secrets generated successfully',
    })
    setTimeout(() => setActionResult(null), 3000)
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div>
            <h1 className="bg-gradient-to-r from-red-600 to-orange-400 bg-clip-text text-4xl font-bold text-transparent dark:from-red-400 dark:to-orange-300">
              Secrets Management
            </h1>
            <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
              Manage sensitive environment variables and credentials
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-5 w-5" />
              Generate
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Secret
            </button>
          </div>
        </div>

        {/* Action Result */}
        {actionResult && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              actionResult.success
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <p
                className={
                  actionResult.success
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }
              >
                {actionResult.message}
              </p>
            </div>
          </div>
        )}

        {/* Environment Selector */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="local">Local (Development)</option>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleRotateAll}
                className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
              >
                <RefreshCw className="h-4 w-4" />
                Rotate All
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Upload className="h-4 w-4" />
                Import
              </button>
            </div>
          </div>
        </div>

        {/* Security Warning */}
        {selectedEnv === 'production' && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">
                  Production Secrets
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  These secrets are critical for production security. Rotating
                  them will require redeployment and may cause temporary
                  downtime.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Secret Form */}
        {showAddForm && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Add New Secret
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Secret Key
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder="SECRET_KEY_NAME"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Secret Value
                </label>
                <input
                  type="password"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter secret value"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddSecret}
                  disabled={!newKey || !newValue}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Secret
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Secrets List */}
        {filteredSecrets.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700">
              <Key className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No Secrets Found
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Add your first secret for {selectedEnv} environment
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Secret
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {filteredSecrets.map((secret) => (
                <div
                  key={secret.id}
                  className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                          {secret.key}
                        </span>
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <code className="flex-1 rounded bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-900 dark:bg-zinc-900 dark:text-white">
                          {visibleSecrets.has(secret.id)
                            ? secret.value
                            : '•'.repeat(secret.value.length)}
                        </code>
                        <button
                          onClick={() => toggleSecretVisibility(secret.id)}
                          className="rounded-lg border border-zinc-300 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          {visibleSecrets.has(secret.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(secret.value)}
                          className="rounded-lg border border-zinc-300 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>
                          Created:{' '}
                          {new Date(secret.createdAt).toLocaleDateString()}
                        </span>
                        {secret.lastRotated && (
                          <span>
                            Last rotated:{' '}
                            {new Date(secret.lastRotated).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSecret(secret.id)}
                      className="ml-4 rounded-lg border border-red-300 p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function SecretsManagementPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SecretsManagementContent />
    </Suspense>
  )
}
