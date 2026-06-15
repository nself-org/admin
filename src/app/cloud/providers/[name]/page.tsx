'use client'

import { ServiceDetailSkeleton } from '@/components/skeletons'
import type { CloudProvider, CloudRegion, CloudSize } from '@/types/cloud'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Cloud,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Save,
  Server,
  TestTube,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Provider-specific credential fields
const credentialFields: Record<
  string,
  {
    name: string
    label: string
    type: 'text' | 'password'
    required: boolean
  }[]
> = {
  aws: [
    {
      name: 'accessKeyId',
      label: 'Access Key ID',
      type: 'text',
      required: true,
    },
    {
      name: 'secretAccessKey',
      label: 'Secret Access Key',
      type: 'password',
      required: true,
    },
    { name: 'region', label: 'Default Region', type: 'text', required: false },
  ],
  gcp: [
    { name: 'projectId', label: 'Project ID', type: 'text', required: true },
    {
      name: 'serviceAccountKey',
      label: 'Service Account Key (JSON)',
      type: 'password',
      required: true,
    },
  ],
  azure: [
    {
      name: 'subscriptionId',
      label: 'Subscription ID',
      type: 'text',
      required: true,
    },
    { name: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
    { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
    },
  ],
  digitalocean: [{ name: 'token', label: 'API Token', type: 'password', required: true }],
  linode: [
    {
      name: 'token',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
    },
  ],
  vultr: [{ name: 'apiKey', label: 'API Key', type: 'password', required: true }],
  hetzner: [{ name: 'token', label: 'API Token', type: 'password', required: true }],
  default: [{ name: 'apiKey', label: 'API Key', type: 'password', required: true }],
}

function ProviderConfigContent({ name }: { name: string }) {
  const providerName = name

  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const { data, isLoading, mutate } = useSWR<{ provider: CloudProvider }>(
    `/api/cloud/providers/${providerName}`,
    fetcher
  )

  const provider = data?.provider

  const fields = credentialFields[providerName] ?? credentialFields['default'] ?? []

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }))
  }

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/cloud/providers/${providerName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      })
      const result = await response.json()
      if (result.success) {
        await mutate()
      }
    } catch (_error) {
      // Handle error silently
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch(`/api/cloud/providers/${providerName}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      })
      const result = await response.json()
      setTestResult({
        success: result.success,
        message:
          result.message || (result.success ? 'Connection successful!' : 'Connection failed'),
      })
    } catch (_error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      })
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/cloud/providers"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">Configure Provider</h1>
            <p className="text-sm text-zinc-400">Loading...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-zinc-800/50" />
          <div className="h-64 rounded-lg bg-zinc-800/50" />
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/cloud/providers"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">Provider Not Found</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
          <p className="text-lg text-zinc-300">Provider &quot;{providerName}&quot; not found</p>
          <Link href="/cloud/providers" className="mt-4 text-emerald-400 hover:text-emerald-300">
            Back to providers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/cloud/providers"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700">
              <Cloud className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{provider.displayName}</h1>
              <p className="text-sm text-zinc-400">Configure credentials and settings</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {provider.configured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-3 py-1 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Configured
            </span>
          )}
          {provider.documentationUrl && (
            <a
              href={provider.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              <ExternalLink className="h-4 w-4" />
              Docs
            </a>
          )}
        </div>
      </div>

      {/* Provider Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Credentials Form */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50">
            <div className="border-b border-zinc-700/50 p-4">
              <h2 className="text-lg font-semibold text-white">Credentials</h2>
              <p className="text-sm text-zinc-400">
                Enter your {provider.displayName} API credentials
              </p>
            </div>
            <div className="space-y-4 p-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    {field.label}
                    {field.required && <span className="ml-1 text-red-400">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={
                        field.type === 'password' && !showSecrets[field.name] ? 'password' : 'text'
                      }
                      value={credentials[field.name] || ''}
                      onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 pr-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(field.name)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showSecrets[field.name] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Test Result */}
              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg p-3 ${
                    testResult.success
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  {testResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Credentials
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Features */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-3 font-medium text-white">Features</h3>
            <div className="flex flex-wrap gap-2">
              {provider.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded bg-zinc-700/50 px-2 py-1 text-sm text-zinc-400"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-3 font-medium text-white">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Regions</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {provider.regions?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Server className="h-4 w-4" />
                  <span className="text-sm">Server Sizes</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {provider.sizes?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Pricing</span>
                </div>
                <span className="text-sm text-emerald-400">Available</span>
              </div>
            </div>
          </div>

          {/* Regions Preview */}
          {provider.regions && provider.regions.length > 0 && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-3 font-medium text-white">Regions</h3>
              <div className="space-y-2">
                {provider.regions.slice(0, 5).map((region: CloudRegion) => (
                  <div key={region.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">{region.displayName}</span>
                    <span className={region.available ? 'text-emerald-400' : 'text-zinc-500'}>
                      {region.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                ))}
                {provider.regions.length > 5 && (
                  <p className="text-sm text-zinc-500">
                    +{provider.regions.length - 5} more regions
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sizes Preview */}
          {provider.sizes && provider.sizes.length > 0 && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-3 font-medium text-white">Server Sizes</h3>
              <div className="space-y-2">
                {provider.sizes.slice(0, 5).map((size: CloudSize) => (
                  <div key={size.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      {size.vcpu} vCPU / {size.memory}
                    </span>
                    <span className="text-emerald-400">${size.monthlyPrice}/mo</span>
                  </div>
                ))}
                {provider.sizes.length > 5 && (
                  <p className="text-sm text-zinc-500">+{provider.sizes.length - 5} more sizes</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function ProviderConfigPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <ProviderConfigContent name={name} />
    </Suspense>
  )
}
