'use client'

import type { HelmValues } from '@/types/k8s'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Code,
  Copy,
  Download,
  Eye,
  FileCode,
  RefreshCw,
  Save,
  Settings,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Default values template
const defaultValues = `# Default values for chart
# This is a YAML-formatted file.

replicaCount: 1

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: ""

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}
podSecurityContext: {}

securityContext: {}

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls: []

resources: {}
  # limits:
  #   cpu: 100m
  #   memory: 128Mi
  # requests:
  #   cpu: 100m
  #   memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}
`

function HelmValuesContent() {
  const searchParams = useSearchParams()
  const chartParam = searchParams.get('chart') || ''
  const repoParam = searchParams.get('repo') || ''
  const releaseParam = searchParams.get('release') || ''

  const [values, setValues] = useState(defaultValues)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { data: valuesData } = useSWR<{ values: HelmValues }>(
    releaseParam ? `/api/helm/releases/${releaseParam}/values` : null,
    fetcher,
  )

  // Load values if editing existing release
  useState(() => {
    if (valuesData?.values?.content) {
      setValues(valuesData.values.content)
    }
  })

  const handleSave = async () => {
    setSaving(true)
    setValidationErrors([])

    // Simulate YAML validation
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simple validation check (in production would use yaml parser)
    const errors: string[] = []
    if (values.includes('\t')) {
      errors.push('YAML should use spaces, not tabs')
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(values)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([values], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'values.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.yaml,.yml'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setValues(event.target?.result as string)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleReset = () => {
    if (confirm('Reset to default values? This will discard your changes.')) {
      setValues(defaultValues)
      setValidationErrors([])
    }
  }

  const title = releaseParam
    ? `Edit Values: ${releaseParam}`
    : chartParam
      ? `Values: ${repoParam}/${chartParam}`
      : 'Helm Values Editor'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={
              releaseParam ? `/helm?release=${releaseParam}` : '/helm/install'
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-zinc-400">
              Customize chart values before installation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Validating...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Values
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
            <div>
              <h3 className="font-medium text-red-400">Validation Errors</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-400">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Editor */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-900/50 px-4 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm ${
                    viewMode === 'edit'
                      ? 'bg-sky-500 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Code className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm ${
                    viewMode === 'preview'
                      ? 'bg-sky-500 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleUpload}
                  className="rounded p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  title="Upload values.yaml"
                >
                  <Upload className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  title="Download values.yaml"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCopy}
                  className="rounded p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Editor/Preview Area */}
            {viewMode === 'edit' ? (
              <textarea
                value={values}
                onChange={(e) => setValues(e.target.value)}
                className="h-[600px] w-full resize-none bg-zinc-900 p-4 font-mono text-sm text-zinc-300 focus:outline-none"
                spellCheck={false}
              />
            ) : (
              <pre className="h-[600px] overflow-auto bg-zinc-900 p-4">
                <code className="font-mono text-sm text-zinc-300">
                  {values}
                </code>
              </pre>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h2 className="mb-4 font-semibold text-white">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const withIngress = values.replace(
                    'ingress:\n  enabled: false',
                    'ingress:\n  enabled: true',
                  )
                  setValues(withIngress)
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-white hover:bg-zinc-700"
              >
                Enable Ingress
              </button>
              <button
                onClick={() => {
                  const withAutoscaling = values.replace(
                    'autoscaling:\n  enabled: false',
                    'autoscaling:\n  enabled: true',
                  )
                  setValues(withAutoscaling)
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-white hover:bg-zinc-700"
              >
                Enable Autoscaling
              </button>
              <button
                onClick={() => {
                  setValues(
                    values.replace('replicaCount: 1', 'replicaCount: 3'),
                  )
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-white hover:bg-zinc-700"
              >
                Set 3 Replicas
              </button>
            </div>
          </div>

          {/* Chart Info */}
          {chartParam && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-3 font-medium text-white">Chart Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Repository</span>
                  <span className="text-white">{repoParam || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Chart</span>
                  <span className="text-white">{chartParam}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-3 font-medium text-white">Tips</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <FileCode className="mt-0.5 h-4 w-4 text-sky-400" />
                Use spaces, not tabs for indentation
              </li>
              <li className="flex items-start gap-2">
                <Settings className="mt-0.5 h-4 w-4 text-sky-400" />
                Values override chart defaults
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-sky-400" />
                Comments start with #
              </li>
            </ul>
          </div>

          {/* CLI Command */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              CLI Command
            </h3>
            <code className="block rounded bg-zinc-900 p-3 text-sm text-sky-400">
              helm install {releaseParam || 'RELEASE'}{' '}
              {repoParam ? `${repoParam}/${chartParam || 'CHART'}` : 'CHART'} -f
              values.yaml
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HelmValuesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Helm Values Editor
            </h1>
            <p className="text-sm text-zinc-400">Loading...</p>
          </div>
          <div className="animate-pulse">
            <div className="h-[600px] rounded-lg bg-zinc-800/50" />
          </div>
        </div>
      }
    >
      <HelmValuesContent />
    </Suspense>
  )
}
