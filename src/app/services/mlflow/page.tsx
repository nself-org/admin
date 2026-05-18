'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Beaker,
  BoxSelect,
  ExternalLink,
  FlaskConical,
  Loader2,
  RefreshCw,
  Terminal,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function MLflowContent() {
  // General state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cliOutput, setCliOutput] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<string>('nself service mlflow experiments')

  // Init state
  const [initializing, setInitializing] = useState(false)

  // Experiments state
  const [experimentsOutput, setExperimentsOutput] = useState<string | null>(null)
  const [loadingExperiments, setLoadingExperiments] = useState(false)

  // Models state
  const [modelsOutput, setModelsOutput] = useState<string | null>(null)
  const [loadingModels, setLoadingModels] = useState(false)

  // UI state
  const [mlflowUiOutput, setMlflowUiOutput] = useState<string | null>(null)
  const [loadingUi, setLoadingUi] = useState(false)

  // ---------------------------------------------------------------------------
  // Initialize MLflow service
  // ---------------------------------------------------------------------------
  const initMlflow = useCallback(async () => {
    setInitializing(true)
    setError(null)
    setLastCommand('nself service mlflow init')
    try {
      const res = await fetch('/api/services/mlflow/init', {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'MLflow service initialized')
      } else {
        setError(json.error || 'Failed to initialize MLflow service')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setInitializing(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch experiments
  // ---------------------------------------------------------------------------
  const fetchExperiments = useCallback(async () => {
    setLoadingExperiments(true)
    setError(null)
    setLastCommand('nself service mlflow experiments')
    try {
      const res = await fetch('/api/services/mlflow/experiments')
      const json = await res.json()
      if (json.success) {
        setExperimentsOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to list experiments')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoadingExperiments(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch models
  // ---------------------------------------------------------------------------
  const fetchModels = useCallback(async () => {
    setLoadingModels(true)
    setError(null)
    setLastCommand('nself service mlflow models')
    try {
      const res = await fetch('/api/services/mlflow/models')
      const json = await res.json()
      if (json.success) {
        setModelsOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to list models')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoadingModels(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Get MLflow UI info
  // ---------------------------------------------------------------------------
  const fetchMlflowUi = useCallback(async () => {
    setLoadingUi(true)
    setError(null)
    setLastCommand('nself service mlflow ui')
    try {
      const res = await fetch('/api/services/mlflow/ui')
      const json = await res.json()
      if (json.success) {
        setMlflowUiOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to get MLflow UI info')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoadingUi(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Refresh all data
  // ---------------------------------------------------------------------------
  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchExperiments(), fetchModels(), fetchMlflowUi()])
    } finally {
      setLoading(false)
    }
  }, [fetchExperiments, fetchModels, fetchMlflowUi])

  return (
    <PageShell
      title="MLflow"
      description="Machine learning experiment tracking, model registry, and management"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh All
          </Button>
          <Button variant="outline" size="sm" onClick={initMlflow}>
            {initializing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Init
          </Button>
          <Button size="sm" onClick={fetchMlflowUi}>
            {loadingUi ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Open UI
          </Button>
        </div>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* MLflow UI Link */}
      {mlflowUiOutput && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-base">MLflow UI</CardTitle>
            </div>
            <CardDescription>Access the MLflow tracking server web interface</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
              <pre className="text-sm text-zinc-700 dark:text-zinc-300">{mlflowUiOutput}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experiments */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-base">Experiments</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExperiments}
              disabled={loadingExperiments}
            >
              {loadingExperiments ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Load
            </Button>
          </div>
          <CardDescription>MLflow experiment tracking and run history</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExperiments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : experimentsOutput ? (
            <ScrollArea className="max-h-64">
              <pre className="text-xs text-zinc-700 dark:text-zinc-300">{experimentsOutput}</pre>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <Beaker className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">
                No experiments loaded. Click &ldquo;Load&rdquo; to fetch experiments from MLflow, or
                &ldquo;Init&rdquo; to initialize the service.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Registry */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BoxSelect className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-base">Model Registry</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchModels} disabled={loadingModels}>
              {loadingModels ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Load
            </Button>
          </div>
          <CardDescription>Registered ML models and version management</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingModels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : modelsOutput ? (
            <ScrollArea className="max-h-64">
              <pre className="text-xs text-zinc-700 dark:text-zinc-300">{modelsOutput}</pre>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <BoxSelect className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">
                No models loaded. Click &ldquo;Load&rdquo; to fetch registered models from MLflow.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CLI Command Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">CLI Command</CardTitle>
          </div>
          <CardDescription>Command executed against the nself CLI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 p-4">
            <div className="mb-2 font-mono text-sm text-emerald-400">$ {lastCommand}</div>
            {cliOutput && (
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-xs text-zinc-300">{cliOutput}</pre>
              </ScrollArea>
            )}
            {!cliOutput && (
              <p className="font-mono text-xs text-zinc-500">Run a command to see output here</p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

export default function MLflowPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <MLflowContent />
    </Suspense>
  )
}
