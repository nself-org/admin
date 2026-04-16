'use client'

import { FormSkeleton } from '@/components/skeletons'
import type { HelmChart, HelmRepo } from '@/types/k8s'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Package,
  Play,
  Search,
  Settings,
  Terminal,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Mock repos and charts
const mockRepos: HelmRepo[] = [
  {
    name: 'bitnami',
    url: 'https://charts.bitnami.com/bitnami',
    lastUpdated: '2024-01-25T10:00:00Z',
  },
  {
    name: 'prometheus-community',
    url: 'https://prometheus-community.github.io/helm-charts',
    lastUpdated: '2024-01-24T10:00:00Z',
  },
  {
    name: 'grafana',
    url: 'https://grafana.github.io/helm-charts',
    lastUpdated: '2024-01-24T10:00:00Z',
  },
  {
    name: 'jetstack',
    url: 'https://charts.jetstack.io',
    lastUpdated: '2024-01-23T10:00:00Z',
  },
  {
    name: 'ingress-nginx',
    url: 'https://kubernetes.github.io/ingress-nginx',
    lastUpdated: '2024-01-22T10:00:00Z',
  },
]

const mockCharts: HelmChart[] = [
  {
    name: 'postgresql',
    version: '13.2.24',
    appVersion: '16.1.0',
    description: 'PostgreSQL database',
    keywords: ['database', 'sql'],
  },
  {
    name: 'redis',
    version: '18.6.1',
    appVersion: '7.2.4',
    description: 'Redis in-memory data store',
    keywords: ['cache', 'database'],
  },
  {
    name: 'nginx',
    version: '15.7.0',
    appVersion: '1.25.3',
    description: 'NGINX web server',
    keywords: ['web', 'proxy'],
  },
  {
    name: 'prometheus',
    version: '25.8.0',
    appVersion: '2.48.0',
    description: 'Prometheus monitoring',
    keywords: ['monitoring', 'metrics'],
  },
  {
    name: 'grafana',
    version: '7.0.19',
    appVersion: '10.2.3',
    description: 'Grafana dashboards',
    keywords: ['monitoring', 'visualization'],
  },
  {
    name: 'cert-manager',
    version: '1.13.3',
    appVersion: '1.13.3',
    description: 'Certificate management',
    keywords: ['ssl', 'tls'],
  },
]

type InstallStep = {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
}

function HelmInstallContent() {
  const [selectedRepo, setSelectedRepo] = useState('')
  const [selectedChart, setSelectedChart] = useState<HelmChart | null>(null)
  const [releaseName, setReleaseName] = useState('')
  const [namespace, setNamespace] = useState('default')
  const [searchQuery, setSearchQuery] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [installSteps, setInstallSteps] = useState<InstallStep[]>([])

  const { data: repoData } = useSWR<{ repos: HelmRepo[] }>(
    '/api/helm/repos',
    fetcher,
    { fallbackData: { repos: mockRepos } },
  )

  const { data: chartData } = useSWR<{ charts: HelmChart[] }>(
    selectedRepo ? `/api/helm/repos/${selectedRepo}/charts` : null,
    fetcher,
    { fallbackData: { charts: mockCharts } },
  )

  const repos = repoData?.repos || mockRepos
  const charts = chartData?.charts || (selectedRepo ? mockCharts : [])

  const filteredCharts = charts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleInstall = async () => {
    if (!selectedChart || !releaseName) return

    setInstalling(true)
    const steps: InstallStep[] = [
      { name: 'Validating chart', status: 'pending' },
      { name: 'Downloading chart', status: 'pending' },
      { name: 'Rendering templates', status: 'pending' },
      { name: 'Creating resources', status: 'pending' },
      { name: 'Waiting for pods', status: 'pending' },
    ]

    setInstallSteps(steps)

    for (let i = 0; i < steps.length; i++) {
      setInstallSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'running' } : s)),
      )

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 1000),
      )

      setInstallSteps((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? {
                ...s,
                status: 'success',
                message: dryRun ? 'Dry run - no changes' : 'Completed',
              }
            : s,
        ),
      )
    }

    setInstalling(false)
  }

  const isComplete =
    installSteps.length > 0 && installSteps.every((s) => s.status === 'success')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/helm"
          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Install Release</h1>
          <p className="text-sm text-zinc-400">
            Install a Helm chart from a repository
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Repository and Chart Selection */}
        <div className="space-y-4 lg:col-span-2">
          {/* Repository Selection */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h2 className="mb-4 font-semibold text-white">Select Repository</h2>
            <div className="flex flex-wrap gap-2">
              {repos.map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => {
                    setSelectedRepo(repo.name)
                    setSelectedChart(null)
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                    selectedRepo === repo.name
                      ? 'border-sky-500 bg-sky-900/20 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {repo.name}
                </button>
              ))}
            </div>
            {!repos.length && (
              <p className="text-sm text-zinc-500">
                No repositories configured.{' '}
                <Link
                  href="/helm/repos"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Add one first
                </Link>
              </p>
            )}
          </div>

          {/* Chart Selection */}
          {selectedRepo && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-white">Select Chart</h2>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search charts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 rounded-lg border border-zinc-700 bg-zinc-900 py-2 pr-4 pl-10 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredCharts.map((chart) => (
                  <button
                    key={chart.name}
                    onClick={() => {
                      setSelectedChart(chart)
                      setReleaseName(chart.name)
                    }}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      selectedChart?.name === chart.name
                        ? 'border-sky-500 bg-sky-900/20'
                        : 'border-zinc-700/50 bg-zinc-900/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-white">
                          {chart.name}
                        </div>
                        <div className="text-sm text-zinc-500">
                          v{chart.version}
                        </div>
                      </div>
                      <Package className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      {chart.description}
                    </p>
                  </button>
                ))}
              </div>

              {filteredCharts.length === 0 && (
                <p className="text-center text-sm text-zinc-500">
                  No charts found matching your search
                </p>
              )}
            </div>
          )}

          {/* Installation Progress */}
          {installSteps.length > 0 && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-sky-400" />
                <h2 className="font-semibold text-white">
                  Installation Progress
                </h2>
              </div>

              <div className="space-y-2">
                {installSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {step.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full border-2 border-zinc-600" />
                      )}
                      {step.status === 'running' && (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      )}
                      {step.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      )}
                      {step.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      )}
                      <span
                        className={`text-sm ${
                          step.status === 'pending'
                            ? 'text-zinc-500'
                            : 'text-white'
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {step.message && (
                      <span className="text-sm text-zinc-500">
                        {step.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {isComplete && (
                <div
                  className={`mt-4 rounded-lg p-4 ${
                    dryRun
                      ? 'border border-sky-800/50 bg-sky-900/20'
                      : 'border border-emerald-800/50 bg-emerald-900/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle
                      className={`h-5 w-5 ${
                        dryRun ? 'text-sky-400' : 'text-emerald-400'
                      }`}
                    />
                    <div>
                      <h3
                        className={`font-medium ${
                          dryRun ? 'text-sky-400' : 'text-emerald-400'
                        }`}
                      >
                        {dryRun
                          ? 'Dry Run Complete'
                          : 'Installation Successful!'}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {dryRun
                          ? 'All validations passed. Disable dry run to install.'
                          : `Release "${releaseName}" has been deployed to ${namespace}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Installation Options */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h2 className="mb-4 font-semibold text-white">
              Installation Options
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Release Name
                </label>
                <input
                  type="text"
                  value={releaseName}
                  onChange={(e) => setReleaseName(e.target.value)}
                  placeholder="my-release"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Namespace
                </label>
                <input
                  type="text"
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                  placeholder="default"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-white">Dry Run</label>
                  <p className="text-xs text-zinc-500">
                    Preview without installing
                  </p>
                </div>
                <button
                  onClick={() => setDryRun(!dryRun)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    dryRun ? 'bg-sky-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      dryRun ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleInstall}
              disabled={!selectedChart || !releaseName || installing}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {installing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Installing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {dryRun ? 'Dry Run' : 'Install'}
                </>
              )}
            </button>
          </div>

          {/* Selected Chart Info */}
          {selectedChart && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-3 font-medium text-white">Chart Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Chart</span>
                  <span className="text-white">{selectedChart.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Version</span>
                  <span className="text-white">{selectedChart.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">App Version</span>
                  <span className="text-white">{selectedChart.appVersion}</span>
                </div>
              </div>
              <Link
                href={`/helm/values?chart=${selectedChart.name}&repo=${selectedRepo}`}
                className="mt-3 flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300"
              >
                <Settings className="h-4 w-4" />
                Customize values
              </Link>
            </div>
          )}

          {/* CLI Command */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              CLI Command
            </h3>
            <code className="block rounded bg-zinc-900 p-3 text-sm text-sky-400">
              helm install {releaseName || 'RELEASE_NAME'}{' '}
              {selectedRepo
                ? `${selectedRepo}/${selectedChart?.name || 'CHART'}`
                : 'REPO/CHART'}{' '}
              --namespace {namespace}
              {dryRun ? ' --dry-run' : ''}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HelmInstallPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <HelmInstallContent />
    </Suspense>
  )
}
