'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { CloudProvider, CloudProviderCategory } from '@/types/cloud'
import {
  AlertCircle,
  CheckCircle,
  Cloud,
  ExternalLink,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Provider icons/logos mapping
const providerLogos: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  digitalocean: 'DO',
  linode: 'Linode',
  vultr: 'Vultr',
  hetzner: 'Hetzner',
  ovh: 'OVH',
  scaleway: 'Scaleway',
  upcloud: 'UpCloud',
  exoscale: 'Exoscale',
  cloudflare: 'CF',
  vercel: 'Vercel',
  netlify: 'Netlify',
  railway: 'Railway',
  render: 'Render',
  fly: 'Fly.io',
  contabo: 'Contabo',
  kamatera: 'Kamatera',
  ionos: 'IONOS',
  alibaba: 'Alibaba',
  tencent: 'Tencent',
  oracle: 'Oracle',
  ibm: 'IBM',
  rackspace: 'Rackspace',
  equinix: 'Equinix',
}

const categoryColors: Record<CloudProviderCategory, string> = {
  enterprise:
    'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  developer:
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  budget:
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  regional:
    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  edge: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
}

const categoryDescriptions: Record<CloudProviderCategory, string> = {
  enterprise: 'Full-featured platforms for large-scale deployments',
  developer: 'Developer-friendly platforms with easy setup',
  budget: 'Cost-effective options for smaller projects',
  regional: 'Region-specific providers with local presence',
  edge: 'Edge computing and CDN-focused providers',
}

// Mock providers list (26 providers)
const mockProviders: CloudProvider[] = [
  // Enterprise
  {
    id: 'aws',
    name: 'aws',
    displayName: 'Amazon Web Services',
    category: 'enterprise',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['EC2', 'RDS', 'S3', 'Lambda'],
    documentationUrl: 'https://aws.amazon.com/documentation/',
  },
  {
    id: 'gcp',
    name: 'gcp',
    displayName: 'Google Cloud Platform',
    category: 'enterprise',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Compute Engine', 'Cloud SQL', 'Cloud Storage'],
    documentationUrl: 'https://cloud.google.com/docs',
  },
  {
    id: 'azure',
    name: 'azure',
    displayName: 'Microsoft Azure',
    category: 'enterprise',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Virtual Machines', 'Azure SQL', 'Blob Storage'],
    documentationUrl: 'https://docs.microsoft.com/azure/',
  },
  {
    id: 'oracle',
    name: 'oracle',
    displayName: 'Oracle Cloud',
    category: 'enterprise',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Compute', 'Autonomous DB', 'Object Storage'],
  },
  {
    id: 'ibm',
    name: 'ibm',
    displayName: 'IBM Cloud',
    category: 'enterprise',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Virtual Servers', 'Cloud Databases', 'Object Storage'],
  },
  // Developer
  {
    id: 'digitalocean',
    name: 'digitalocean',
    displayName: 'DigitalOcean',
    category: 'developer',
    configured: true,
    validated: true,
    regions: [],
    sizes: [],
    features: ['Droplets', 'Managed DB', 'Spaces'],
  },
  {
    id: 'linode',
    name: 'linode',
    displayName: 'Linode (Akamai)',
    category: 'developer',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Linodes', 'Managed DB', 'Object Storage'],
  },
  {
    id: 'vultr',
    name: 'vultr',
    displayName: 'Vultr',
    category: 'developer',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Cloud Compute', 'Managed DB', 'Block Storage'],
  },
  {
    id: 'railway',
    name: 'railway',
    displayName: 'Railway',
    category: 'developer',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Instant Deploy', 'Databases', 'CI/CD'],
  },
  {
    id: 'render',
    name: 'render',
    displayName: 'Render',
    category: 'developer',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Web Services', 'Databases', 'Static Sites'],
  },
  {
    id: 'fly',
    name: 'fly',
    displayName: 'Fly.io',
    category: 'developer',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Machines', 'Postgres', 'Edge Deploy'],
  },
  // Budget
  {
    id: 'hetzner',
    name: 'hetzner',
    displayName: 'Hetzner',
    category: 'budget',
    configured: true,
    validated: true,
    regions: [],
    sizes: [],
    features: ['Cloud Servers', 'Dedicated', 'Load Balancers'],
  },
  {
    id: 'contabo',
    name: 'contabo',
    displayName: 'Contabo',
    category: 'budget',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['VPS', 'VDS', 'Object Storage'],
  },
  {
    id: 'scaleway',
    name: 'scaleway',
    displayName: 'Scaleway',
    category: 'budget',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Instances', 'Kubernetes', 'Object Storage'],
  },
  {
    id: 'upcloud',
    name: 'upcloud',
    displayName: 'UpCloud',
    category: 'budget',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Cloud Servers', 'Managed DB', 'Object Storage'],
  },
  {
    id: 'kamatera',
    name: 'kamatera',
    displayName: 'Kamatera',
    category: 'budget',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Cloud Servers', 'Block Storage', 'Firewalls'],
  },
  // Regional
  {
    id: 'ovh',
    name: 'ovh',
    displayName: 'OVHcloud',
    category: 'regional',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Public Cloud', 'Bare Metal', 'Storage'],
  },
  {
    id: 'ionos',
    name: 'ionos',
    displayName: 'IONOS',
    category: 'regional',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['VPS', 'Dedicated', 'Cloud Cubes'],
  },
  {
    id: 'exoscale',
    name: 'exoscale',
    displayName: 'Exoscale',
    category: 'regional',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Compute', 'SKS Kubernetes', 'Object Storage'],
  },
  {
    id: 'alibaba',
    name: 'alibaba',
    displayName: 'Alibaba Cloud',
    category: 'regional',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['ECS', 'ApsaraDB', 'OSS'],
  },
  {
    id: 'tencent',
    name: 'tencent',
    displayName: 'Tencent Cloud',
    category: 'regional',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['CVM', 'TencentDB', 'COS'],
  },
  // Edge
  {
    id: 'cloudflare',
    name: 'cloudflare',
    displayName: 'Cloudflare',
    category: 'edge',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Workers', 'R2 Storage', 'D1 Database'],
  },
  {
    id: 'vercel',
    name: 'vercel',
    displayName: 'Vercel',
    category: 'edge',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Edge Functions', 'KV Storage', 'Postgres'],
  },
  {
    id: 'netlify',
    name: 'netlify',
    displayName: 'Netlify',
    category: 'edge',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Edge Functions', 'Blobs', 'Forms'],
  },
  {
    id: 'rackspace',
    name: 'rackspace',
    displayName: 'Rackspace',
    category: 'edge',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Cloud Servers', 'CDN', 'Managed Services'],
  },
  {
    id: 'equinix',
    name: 'equinix',
    displayName: 'Equinix Metal',
    category: 'edge',
    configured: false,
    validated: false,
    regions: [],
    sizes: [],
    features: ['Bare Metal', 'Interconnection', 'Edge'],
  },
]

function ProvidersContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<
    CloudProviderCategory | 'all'
  >('all')

  const { data, isLoading, mutate } = useSWR<{ providers: CloudProvider[] }>(
    '/api/cloud/providers',
    fetcher,
    {
      fallbackData: { providers: mockProviders },
      refreshInterval: 60000,
    },
  )

  const providers = data?.providers || mockProviders

  const categories: CloudProviderCategory[] = [
    'enterprise',
    'developer',
    'budget',
    'regional',
    'edge',
  ]

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedProviders = categories.reduce(
    (acc, category) => {
      acc[category] = filteredProviders.filter((p) => p.category === category)
      return acc
    },
    {} as Record<CloudProviderCategory, CloudProvider[]>,
  )

  const configuredCount = providers.filter((p) => p.configured).length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cloud Providers</h1>
          <p className="text-sm text-zinc-400">
            Configure cloud provider credentials
          </p>
        </div>
        <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-emerald-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-emerald-400 dark:to-white">
          Cloud Providers
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {configuredCount} of {providers.length} providers configured
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 text-white'
              : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          All ({providers.length})
        </button>
        {categories.map((category) => {
          const count = providers.filter((p) => p.category === category).length
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                selectedCategory === category
                  ? 'bg-emerald-600 text-white'
                  : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {category} ({count})
            </button>
          )
        })}
      </div>

      {/* Providers Grid by Category */}
      {selectedCategory === 'all' ? (
        categories.map((category) => {
          const categoryProviders = groupedProviders[category]
          if (categoryProviders.length === 0) return null

          return (
            <div key={category} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white capitalize">
                  {category}
                </h2>
                <p className="text-sm text-zinc-400">
                  {categoryDescriptions[category]}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryProviders.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}

      {filteredProviders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <Cloud className="mb-4 h-12 w-12 text-zinc-500" />
          <p className="text-lg text-zinc-400">No providers found</p>
          <p className="text-sm text-zinc-500">
            Try adjusting your search or filter
          </p>
        </div>
      )}
    </div>
  )
}

function ProviderCard({ provider }: { provider: CloudProvider }) {
  return (
    <Link
      href={`/cloud/providers/${provider.name}`}
      className="group rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-emerald-500/50 hover:bg-zinc-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700 font-semibold text-white">
            {providerLogos[provider.name] ||
              provider.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-white group-hover:text-emerald-400">
              {provider.displayName}
            </h3>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                categoryColors[provider.category]
              }`}
            >
              {provider.category}
            </span>
          </div>
        </div>
        {provider.configured ? (
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        ) : (
          <AlertCircle className="h-5 w-5 text-zinc-500" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {provider.features.slice(0, 3).map((feature) => (
          <span
            key={feature}
            className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400"
          >
            {feature}
          </span>
        ))}
        {provider.features.length > 3 && (
          <span className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">
            +{provider.features.length - 3}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`text-sm ${
            provider.configured ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          {provider.configured ? 'Configured' : 'Not configured'}
        </span>
        <div className="flex items-center gap-2">
          {provider.documentationUrl && (
            <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
          )}
          <Settings className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400" />
        </div>
      </div>
    </Link>
  )
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <ProvidersContent />
    </Suspense>
  )
}
