'use client'

import { FormSkeleton } from '@/components/skeletons'
import type {
  CloudProvider,
  CloudRegion,
  CloudSize,
  ServerSize,
} from '@/types/cloud'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Cloud,
  Cpu,
  DollarSign,
  Globe,
  Key,
  Rocket,
  Server,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())


function CreateServerContent() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    region: '',
    size: '' as ServerSize | '',
    sshKeyId: '',
    tags: {} as Record<string, string>,
  })
  const [tagInput, setTagInput] = useState({ key: '', value: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const { data } = useSWR<{
    providers: {
      provider: CloudProvider
      regions: CloudRegion[]
      sizes: CloudSize[]
    }[]
  }>('/api/cloud/providers/configured', fetcher)

  const configuredProviders = data?.providers ?? []
  const selectedProviderData = configuredProviders.find(
    (p) => p.provider.name === formData.provider,
  )

  const selectedSize = selectedProviderData?.sizes.find(
    (s) => s.name === formData.size,
  )

  const handleProviderSelect = (providerName: string) => {
    setFormData({
      ...formData,
      provider: providerName,
      region: '',
      size: '',
    })
    setStep(2)
  }

  const handleAddTag = () => {
    if (tagInput.key && tagInput.value) {
      setFormData({
        ...formData,
        tags: { ...formData.tags, [tagInput.key]: tagInput.value },
      })
      setTagInput({ key: '', value: '' })
    }
  }

  const handleRemoveTag = (key: string) => {
    const { [key]: _, ...rest } = formData.tags
    setFormData({ ...formData, tags: rest })
  }

  const handleCreate = async () => {
    if (
      !formData.provider ||
      !formData.name ||
      !formData.region ||
      !formData.size
    ) {
      setError('Please fill in all required fields')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/cloud/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/cloud/servers')
      } else {
        setError(result.error || 'Failed to create server')
      }
    } catch (_err) {
      setError('Failed to create server')
    } finally {
      setCreating(false)
    }
  }

  const isFormValid =
    formData.provider && formData.name && formData.region && formData.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/cloud/servers"
          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Provision Server
          </h1>
          <p className="text-sm text-zinc-400">Create a new cloud server</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        {[
          { num: 1, label: 'Provider' },
          { num: 2, label: 'Configuration' },
          { num: 3, label: 'Review' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => s.num < step && setStep(s.num)}
              disabled={s.num > step}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                step === s.num
                  ? 'bg-emerald-600 text-white'
                  : step > s.num
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  step > s.num
                    ? 'bg-emerald-500'
                    : step === s.num
                      ? 'bg-white text-emerald-600'
                      : 'bg-zinc-700'
                }`}
              >
                {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
              </span>
              {s.label}
            </button>
            {i < 2 && (
              <div
                className={`mx-2 h-0.5 w-12 ${
                  step > s.num ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 p-4 text-red-400">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Step 1: Select Provider */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Select Cloud Provider
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {configuredProviders.map(({ provider }) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.name)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  formData.provider === provider.name
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-zinc-700/50 bg-zinc-800/50 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700">
                    <Cloud className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {provider.displayName}
                    </h3>
                    <p className="text-sm text-zinc-400 capitalize">
                      {provider.category}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {configuredProviders.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
              <Cloud className="mb-4 h-12 w-12 text-zinc-500" />
              <p className="text-lg text-zinc-400">No providers configured</p>
              <Link
                href="/cloud/providers"
                className="mt-4 text-emerald-400 hover:text-emerald-300"
              >
                Configure a provider first
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && selectedProviderData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Server Name */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Server className="h-4 w-4" />
                Server Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., prod-api-1"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Region */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Globe className="h-4 w-4" />
                Region
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedProviderData.regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() =>
                      setFormData({ ...formData, region: region.id })
                    }
                    disabled={!region.available}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      formData.region === region.id
                        ? 'border-emerald-500 bg-emerald-900/20 text-white'
                        : region.available
                          ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                          : 'border-zinc-800 text-zinc-600'
                    }`}
                  >
                    {region.displayName}
                    <span className="ml-1 text-xs text-zinc-500">
                      ({region.country})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Cpu className="h-4 w-4" />
                Server Size
              </label>
              <div className="space-y-2">
                {selectedProviderData.sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        size: size.name as ServerSize,
                      })
                    }
                    className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${
                      formData.size === size.name
                        ? 'border-emerald-500 bg-emerald-900/20'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white capitalize">
                        {size.name}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {size.vcpu} vCPU / {size.memory} / {size.storage}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-emerald-400">
                        ${size.monthlyPrice}/mo
                      </div>
                      <div className="text-sm text-zinc-500">
                        ${size.hourlyPrice}/hr
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* SSH Key */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Key className="h-4 w-4" />
                SSH Key (Optional)
              </label>
              <input
                type="text"
                value={formData.sshKeyId}
                onChange={(e) =>
                  setFormData({ ...formData, sshKeyId: e.target.value })
                }
                placeholder="SSH Key ID or fingerprint"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Tag className="h-4 w-4" />
                Tags (Optional)
              </label>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={tagInput.key}
                  onChange={(e) =>
                    setTagInput({ ...tagInput, key: e.target.value })
                  }
                  placeholder="Key"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
                <input
                  type="text"
                  value={tagInput.value}
                  onChange={(e) =>
                    setTagInput({ ...tagInput, value: e.target.value })
                  }
                  placeholder="Value"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
                <button
                  onClick={handleAddTag}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                >
                  Add
                </button>
              </div>
              {Object.keys(formData.tags).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(formData.tags).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded bg-zinc-700 px-2 py-1 text-sm text-zinc-300"
                    >
                      {key}: {value}
                      <button
                        onClick={() => handleRemoveTag(key)}
                        className="ml-1 text-zinc-500 hover:text-white"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-white hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.name || !formData.region || !formData.size}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Continue to Review
              </button>
            </div>
          </div>

          {/* Price Summary Sidebar */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <DollarSign className="h-5 w-5" />
              Price Estimate
            </h3>
            {selectedSize ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
                  <span className="text-zinc-400">Server</span>
                  <span className="font-medium text-white">
                    ${selectedSize.monthlyPrice}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-xl font-bold text-emerald-400">
                    ${selectedSize.monthlyPrice}/mo
                  </span>
                </div>
                <p className="text-sm text-zinc-500">
                  Billed hourly at ${selectedSize.hourlyPrice}/hr
                </p>
              </div>
            ) : (
              <p className="text-zinc-500">Select a size to see pricing</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && selectedProviderData && (
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Review Configuration
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-zinc-400">Provider</span>
                <p className="font-medium text-white">
                  {selectedProviderData.provider.displayName}
                </p>
              </div>
              <div>
                <span className="text-sm text-zinc-400">Server Name</span>
                <p className="font-medium text-white">{formData.name}</p>
              </div>
              <div>
                <span className="text-sm text-zinc-400">Region</span>
                <p className="font-medium text-white">{formData.region}</p>
              </div>
              <div>
                <span className="text-sm text-zinc-400">Size</span>
                <p className="font-medium text-white capitalize">
                  {formData.size}
                </p>
              </div>
              {selectedSize && (
                <>
                  <div>
                    <span className="text-sm text-zinc-400">Specs</span>
                    <p className="font-medium text-white">
                      {selectedSize.vcpu} vCPU / {selectedSize.memory} /{' '}
                      {selectedSize.storage}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-400">Monthly Cost</span>
                    <p className="font-medium text-emerald-400">
                      ${selectedSize.monthlyPrice}/mo
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-white hover:bg-zinc-700"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!isFormValid || creating}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Provision Server
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreateServerPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <CreateServerContent />
    </Suspense>
  )
}
