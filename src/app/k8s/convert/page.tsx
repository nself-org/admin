'use client'

import { FormSkeleton } from '@/components/skeletons'
import type { K8sConvertOptions, K8sManifest } from '@/types/k8s'
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  Eye,
  FileCode,
  FolderTree,
  Play,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'

function K8sConvertContent() {
  const [options, setOptions] = useState<K8sConvertOptions>({
    namespace: 'default',
    outputDir: './k8s',
    replicas: 3,
    imageTag: 'latest',
    ingressEnabled: true,
    ingressClassName: 'nginx',
  })
  const [converting, setConverting] = useState(false)
  const [manifests, setManifests] = useState<K8sManifest[]>([])
  const [selectedManifest, setSelectedManifest] = useState<K8sManifest | null>(null)
  const [copied, setCopied] = useState(false)

  const handleConvert = async () => {
    setConverting(true)
    try {
      const res = await fetch('/api/k8s/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const result: K8sManifest[] = data?.manifests ?? []
      setManifests(result)
      if (result.length > 0) setSelectedManifest(result[0])
    } finally {
      setConverting(false)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadAll = () => {
    // In production, this would create and download a zip file
    alert('Download functionality would create a zip file with all manifests')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/k8s"
          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Convert to Kubernetes</h1>
          <p className="text-sm text-zinc-400">Generate Kubernetes manifests from Docker Compose</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Options Panel */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <h2 className="font-semibold text-white">Conversion Options</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Namespace</label>
                <input
                  type="text"
                  value={options.namespace}
                  onChange={(e) => setOptions({ ...options, namespace: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">Output Directory</label>
                <input
                  type="text"
                  value={options.outputDir}
                  onChange={(e) => setOptions({ ...options, outputDir: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">Default Replicas</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={options.replicas}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      replicas: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">Image Tag</label>
                <input
                  type="text"
                  value={options.imageTag || ''}
                  onChange={(e) => setOptions({ ...options, imageTag: e.target.value })}
                  placeholder="latest"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Enable Ingress</label>
                <button
                  onClick={() =>
                    setOptions({
                      ...options,
                      ingressEnabled: !options.ingressEnabled,
                    })
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    options.ingressEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      options.ingressEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {options.ingressEnabled && (
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Ingress Class</label>
                  <select
                    value={options.ingressClassName || 'nginx'}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        ingressClassName: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="nginx">nginx</option>
                    <option value="traefik">traefik</option>
                    <option value="haproxy">haproxy</option>
                    <option value="kong">kong</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleConvert}
              disabled={converting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {converting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Converting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Convert
                </>
              )}
            </button>
          </div>

          {/* CLI Command */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Or use CLI</h3>
            <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
              nself k8s convert --namespace={options.namespace} --replicas=
              {options.replicas}
            </code>
          </div>
        </div>

        {/* Manifests List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Generated Manifests</h2>
            {manifests.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                <Download className="h-4 w-4" />
                Download All
              </button>
            )}
          </div>

          {manifests.length > 0 ? (
            <div className="space-y-2">
              {manifests.map((manifest) => (
                <button
                  key={manifest.filename}
                  onClick={() => setSelectedManifest(manifest)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                    selectedManifest?.filename === manifest.filename
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">{manifest.filename}</div>
                      <div className="text-sm text-zinc-400">
                        {manifest.kind}: {manifest.name}
                      </div>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-zinc-500" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
              <FolderTree className="mb-4 h-12 w-12 text-zinc-500" />
              <p className="text-zinc-400">No manifests generated yet</p>
              <p className="text-sm text-zinc-500">
                Click Convert to generate Kubernetes manifests
              </p>
            </div>
          )}
        </div>

        {/* Manifest Preview */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Preview</h2>
            {selectedManifest && (
              <button
                onClick={() => handleCopy(selectedManifest.content)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {selectedManifest ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900">
              <div className="border-b border-zinc-700/50 bg-zinc-800/50 px-4 py-2">
                <span className="font-mono text-sm text-zinc-400">{selectedManifest.filename}</span>
              </div>
              <pre className="max-h-[500px] overflow-auto p-4">
                <code className="font-mono text-sm text-zinc-300">{selectedManifest.content}</code>
              </pre>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
              <FileCode className="mb-4 h-12 w-12 text-zinc-500" />
              <p className="text-zinc-400">Select a manifest to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      {manifests.length > 0 && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-900/20 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-medium text-emerald-400">Manifests Generated Successfully</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {manifests.length} manifest files have been generated. You can now deploy them to
                your cluster.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href="/k8s/deploy"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                >
                  <Play className="h-4 w-4" />
                  Deploy to Cluster
                </Link>
                <button
                  onClick={handleDownloadAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  <Download className="h-4 w-4" />
                  Download Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function K8sConvertPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <K8sConvertContent />
    </Suspense>
  )
}
