'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Settings,
  Terminal,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'

const ENVIRONMENTS = [
  { value: 'local', label: 'Local' },
  { value: 'dev', label: 'Dev' },
  { value: 'stage', label: 'Stage' },
  { value: 'prod', label: 'Prod' },
]

const FORMATS = [
  { value: 'json', label: 'JSON', extension: '.json' },
  { value: 'yaml', label: 'YAML', extension: '.yaml' },
]

type ActionState = 'idle' | 'running' | 'success' | 'error' | 'unauth' | 'offline'

export default function ConfigExportPage() {
  const [environment, setEnvironment] = useState('local')
  const [format, setFormat] = useState('json')
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [lastOutput, setLastOutput] = useState('')
  const [exportedContent, setExportedContent] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const runExport = async () => {
    setActionState('running')
    setLastOutput('')
    setExportedContent(null)
    setErrorMessage('')

    try {
      const response = await fetch('/api/config/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment, format }),
      })

      if (response.status === 401) {
        setActionState('unauth')
        return
      }

      const data = await response.json()

      if (data.success && data.data?.content) {
        setExportedContent(data.data.content)
        setLastOutput(data.data.content)
        setActionState('success')
      } else {
        const msg = data.error || data.details || JSON.stringify(data, null, 2)
        setLastOutput(msg)
        setErrorMessage(msg)
        setActionState('error')
      }
    } catch (_err) {
      const msg = 'Cannot reach admin API. Check your network connection.'
      setLastOutput(msg)
      setErrorMessage(msg)
      setActionState('offline')
    }
  }

  const downloadFile = () => {
    if (!exportedContent) return

    const selectedFormat = FORMATS.find((f) => f.value === format)
    const extension = selectedFormat?.extension || '.json'
    const mimeType = format === 'yaml' ? 'application/x-yaml' : 'application/json'

    const blob = new Blob([exportedContent], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `config-${environment}${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (actionState === 'unauth') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-muted-foreground text-sm">Please log in to export configuration.</p>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = '/login'
          }}
        >
          Go to Login
        </Button>
      </div>
    )
  }

  if (actionState === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <WifiOff className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">Cannot connect to admin API</p>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
        <Button variant="outline" onClick={() => setActionState('idle')}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Download className="h-6 w-6" />
          Config Export
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Export environment configuration to a downloadable file. Secrets are redacted from
          exports.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertTitle>nself CLI Integration</AlertTitle>
        <AlertDescription>
          This page executes{' '}
          <code className="bg-muted rounded px-1 text-xs">nself config export</code> to export
          configuration for a specific environment. Secret values are redacted and not included in
          the export.
        </AlertDescription>
      </Alert>

      {actionState === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Export Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <CardTitle>Export Configuration</CardTitle>
            </div>
            <CardDescription>Select an environment and format to export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Environment
              </label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((env) => (
                    <SelectItem key={env.value} value={env.value}>
                      {env.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={runExport}
                disabled={actionState === 'running'}
                className="flex-1"
                size="lg"
              >
                {actionState === 'running' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={downloadFile}
                disabled={!exportedContent}
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            {/* Command Preview */}
            <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
              <div className="flex items-center gap-2 text-zinc-500">
                <Terminal className="h-4 w-4" />
                <span>Command:</span>
              </div>
              <div className="mt-2">
                $ nself config export --env={environment} --format={format}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exported Content / CLI Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {exportedContent ? 'Exported Configuration' : 'CLI Output'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80 rounded-lg bg-zinc-950 p-4">
              {lastOutput ? (
                <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                  {lastOutput}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  Run an export to see output here
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Success/Error Indicator */}
      {(actionState === 'success' || actionState === 'error') && lastOutput && (
        <div
          className={`fixed right-4 bottom-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
            actionState === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {actionState === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Config exported successfully
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Export failed
            </>
          )}
        </div>
      )}
    </div>
  )
}
