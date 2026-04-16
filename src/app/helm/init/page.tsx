'use client'

import { FormSkeleton } from '@/components/skeletons'
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  Eye,
  FileCode,
  FolderTree,
  Package,
  Play,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'

interface ChartFile {
  name: string
  path: string
  content: string
}

function HelmInitContent() {
  const [chartName, setChartName] = useState('nself')
  const [chartVersion, setChartVersion] = useState('0.1.0')
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [description, setDescription] = useState('A Helm chart for nself')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [files, setFiles] = useState<ChartFile[]>([])
  const [selectedFile, setSelectedFile] = useState<ChartFile | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    // Simulate generation
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const generatedFiles: ChartFile[] = [
      {
        name: 'Chart.yaml',
        path: `${chartName}/Chart.yaml`,
        content: `apiVersion: v2
name: ${chartName}
description: ${description}
type: application
version: ${chartVersion}
appVersion: "${appVersion}"
maintainers:
  - name: Your Name
    email: your@email.com
`,
      },
      {
        name: 'values.yaml',
        path: `${chartName}/values.yaml`,
        content: `# Default values for ${chartName}

replicaCount: 1

image:
  repository: ${chartName}
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
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}
`,
      },
      {
        name: 'deployment.yaml',
        path: `${chartName}/templates/deployment.yaml`,
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${chartName}.fullname" . }}
  labels:
    {{- include "${chartName}.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "${chartName}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "${chartName}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
`,
      },
      {
        name: 'service.yaml',
        path: `${chartName}/templates/service.yaml`,
        content: `apiVersion: v1
kind: Service
metadata:
  name: {{ include "${chartName}.fullname" . }}
  labels:
    {{- include "${chartName}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "${chartName}.selectorLabels" . | nindent 4 }}
`,
      },
      {
        name: '_helpers.tpl',
        path: `${chartName}/templates/_helpers.tpl`,
        content: `{{/*
Expand the name of the chart.
*/}}
{{- define "${chartName}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "${chartName}.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "${chartName}.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${chartName}.labels" -}}
helm.sh/chart: {{ include "${chartName}.chart" . }}
{{ include "${chartName}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "${chartName}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${chartName}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
`,
      },
    ]

    setFiles(generatedFiles)
    setSelectedFile(generatedFiles[0])
    setGenerated(true)
    setGenerating(false)
  }

  const handleCopy = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadAll = () => {
    // In production, would create and download a zip file
    alert('Download functionality would create a zip file with all chart files')
  }

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
          <h1 className="text-2xl font-semibold text-white">
            Initialize Helm Chart
          </h1>
          <p className="text-sm text-zinc-400">
            Create a new Helm chart structure
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h2 className="mb-4 font-semibold text-white">
              Chart Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Chart Name
                </label>
                <input
                  type="text"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  placeholder="my-chart"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Chart Version
                </label>
                <input
                  type="text"
                  value={chartVersion}
                  onChange={(e) => setChartVersion(e.target.value)}
                  placeholder="0.1.0"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  App Version
                </label>
                <input
                  type="text"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A Helm chart for..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !chartName}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Generate Chart
                </>
              )}
            </button>
          </div>

          {/* CLI Command */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              Or use CLI
            </h3>
            <code className="block rounded bg-zinc-900 p-3 text-sm text-sky-400">
              helm create {chartName || 'my-chart'}
            </code>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Generated Files</h2>
            {files.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
          </div>

          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                    selectedFile?.path === file.path
                      ? 'border-sky-500 bg-sky-900/20'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-sky-400" />
                    <div>
                      <div className="font-medium text-white">{file.name}</div>
                      <div className="text-sm text-zinc-500">{file.path}</div>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-zinc-500" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
              <FolderTree className="mb-4 h-12 w-12 text-zinc-500" />
              <p className="text-zinc-400">No files generated yet</p>
              <p className="text-sm text-zinc-500">
                Configure your chart and click Generate
              </p>
            </div>
          )}
        </div>

        {/* File Preview */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Preview</h2>
            {selectedFile && (
              <button
                onClick={handleCopy}
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

          {selectedFile ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900">
              <div className="border-b border-zinc-700/50 bg-zinc-800/50 px-4 py-2">
                <span className="font-mono text-sm text-zinc-400">
                  {selectedFile.path}
                </span>
              </div>
              <pre className="max-h-[500px] overflow-auto p-4">
                <code className="font-mono text-sm text-zinc-300">
                  {selectedFile.content}
                </code>
              </pre>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
              <FileCode className="mb-4 h-12 w-12 text-zinc-500" />
              <p className="text-zinc-400">Select a file to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {generated && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-900/20 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-medium text-emerald-400">
                Chart Generated Successfully
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {files.length} files have been generated. You can now customize
                the values and install the chart.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href="/helm/install"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                >
                  <Package className="h-4 w-4" />
                  Install Chart
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

export default function HelmInitPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <HelmInitContent />
    </Suspense>
  )
}
