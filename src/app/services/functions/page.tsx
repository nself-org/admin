'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useUrlState } from '@/hooks/useUrlState'
import {
  Activity,
  Clock,
  Code2,
  Download,
  FileCode,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  ScrollText,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FunctionEntry {
  name: string
  runtime: string
  status: string
  lastDeployed?: string
  invocations?: number
  avgDuration?: number
  errorRate?: number
}

interface DeploymentStatus {
  functionName: string
  status: 'pending' | 'deploying' | 'success' | 'failed'
  progress: number
  message: string
}

interface FunctionTemplate {
  id: string
  name: string
  runtime: string
  description: string
  category: string
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function FunctionsContent() {
  // List state
  const [functions, setFunctions] = useState<FunctionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cliOutput, setCliOutput] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<string>(
    'nself service functions list',
  )

  // Deploy state
  const [deploying, setDeploying] = useState(false)

  // Init state
  const [initializing, setInitializing] = useState(false)

  // Logs state
  const [logsOutput, setLogsOutput] = useState<string | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Invoke state
  const [invokeName, setInvokeName] = useState('')
  const [invokePayload, setInvokePayload] = useState('')
  const [invoking, setInvoking] = useState(false)
  const [invokeResult, setInvokeResult] = useState<string | null>(null)

  // Enhanced features state
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'overview')
  const [deploymentStatus, setDeploymentStatus] = useState<
    DeploymentStatus[]
  >([])
  const [logLevel, setLogLevel] = useState('all')
  const [filteredLogs, setFilteredLogs] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] =
    useState<FunctionTemplate | null>(null)

  // Static quick-start templates (not fetched from backend — these are UI scaffolding).
  const templates: FunctionTemplate[] = [
    {
      id: 'http-api',
      name: 'HTTP API',
      runtime: 'Node.js 18',
      description: 'RESTful API endpoint',
      category: 'api',
    },
    {
      id: 'cron-job',
      name: 'Scheduled Task',
      runtime: 'Python 3.11',
      description: 'Recurring cron job',
      category: 'scheduled',
    },
    {
      id: 'event-handler',
      name: 'Event Handler',
      runtime: 'Node.js 18',
      description: 'Process async events',
      category: 'events',
    },
    {
      id: 'webhook',
      name: 'Webhook Receiver',
      runtime: 'Go 1.21',
      description: 'Handle webhook requests',
      category: 'api',
    },
  ]

  // ---------------------------------------------------------------------------
  // Fetch functions list
  // ---------------------------------------------------------------------------
  const fetchFunctions = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service functions list')
    try {
      const res = await fetch('/api/services/functions/list')
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output)
        // Map real CLI output (FunctionInfo: {name, status, url, dir}) to FunctionEntry.
        const rawFns = Array.isArray(json.data.functions)
          ? (json.data.functions as Array<{
              name?: string
              status?: string
              url?: string
            }>)
          : []
        setFunctions(
          rawFns.map((f) => ({
            name: f.name ?? '',
            runtime: 'node',
            status: f.status ?? 'unknown',
          })),
        )
      } else {
        setError(json.error || 'Failed to list functions')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Initialize functions service
  // ---------------------------------------------------------------------------
  const initFunctions = useCallback(async () => {
    setInitializing(true)
    setError(null)
    setLastCommand('nself service functions init')
    try {
      const res = await fetch('/api/services/functions/init', {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Functions service initialized')
      } else {
        setError(json.error || 'Failed to initialize functions service')
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
  // Deploy functions
  // ---------------------------------------------------------------------------
  const deployFunctions = useCallback(async () => {
    setDeploying(true)
    setError(null)
    setLastCommand('nself service functions deploy')
    try {
      const res = await fetch('/api/services/functions/deploy', {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Functions deployed successfully')
        await fetchFunctions()
      } else {
        setError(json.error || 'Failed to deploy functions')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setDeploying(false)
    }
  }, [fetchFunctions])

  // ---------------------------------------------------------------------------
  // Fetch logs
  // ---------------------------------------------------------------------------
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    setError(null)
    setLastCommand('nself service functions logs')
    try {
      const res = await fetch('/api/services/functions/logs')
      const json = await res.json()
      if (json.success) {
        setLogsOutput(json.data.output)
        setFilteredLogs(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to fetch function logs')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Invoke function
  // ---------------------------------------------------------------------------
  const invokeFunction = useCallback(async () => {
    if (!invokeName) return

    setInvoking(true)
    setError(null)
    setInvokeResult(null)
    const payloadDisplay = invokePayload ? ' --payload=...' : ''
    setLastCommand(
      `nself service functions invoke --name=${invokeName}${payloadDisplay}`,
    )
    try {
      const res = await fetch('/api/services/functions/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: invokeName,
          ...(invokePayload ? { payload: invokePayload } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setInvokeResult(json.data.output || 'Function invoked successfully')
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to invoke function')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setInvoking(false)
    }
  }, [invokeName, invokePayload])

  // Filter logs by level
  const handleFilterLogs = useCallback(
    (level: string) => {
      setLogLevel(level)
      if (!logsOutput) return
      if (level === 'all') {
        setFilteredLogs(logsOutput)
        return
      }
      const lines = logsOutput
        .split('\n')
        .filter((line) => line.toLowerCase().includes(level.toLowerCase()))
      setFilteredLogs(lines.join('\n'))
    },
    [logsOutput],
  )

  return (
    <PageShell
      title="Functions"
      description="Manage, deploy, and test serverless functions with real-time metrics"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFunctions}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <ScrollText className="mr-2 h-4 w-4" />
            Logs
          </Button>
          <Button variant="outline" size="sm" onClick={initFunctions}>
            {initializing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Init
          </Button>
          <Button size="sm" onClick={deployFunctions}>
            {deploying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Deploy
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

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deploy">Deploy Status</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Functions
                    </p>
                    <p className="text-2xl font-bold">{functions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Invocations
                    </p>
                    <p className="text-2xl font-bold">
                      {functions
                        .reduce((sum, f) => sum + (f.invocations || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Avg Duration
                    </p>
                    <p className="text-2xl font-bold">
                      {functions.length > 0
                        ? Math.round(
                            functions.reduce(
                              (sum, f) => sum + (f.avgDuration || 0),
                              0,
                            ) / functions.length,
                          )
                        : 0}
                      ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                    <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Error Rate
                    </p>
                    <p className="text-2xl font-bold">
                      {functions.length > 0
                        ? (
                            functions.reduce(
                              (sum, f) => sum + (f.errorRate || 0),
                              0,
                            ) / functions.length
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Function List */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-base">Deployed Functions</CardTitle>
              </div>
              <CardDescription>
                All registered serverless functions and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {functions.length === 0 ? (
                <div className="py-8 text-center">
                  <Code2 className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                  <p className="text-sm text-zinc-500">
                    No functions found. Click &ldquo;Refresh&rdquo; to load from
                    the CLI, &ldquo;Init&rdquo; to initialize the service, or
                    &ldquo;Deploy&rdquo; to deploy your functions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {functions.map((fn) => (
                    <div
                      key={fn.name}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {fn.name}
                          </code>
                          <Badge
                            variant={
                              fn.status === 'active' ? 'default' : 'secondary'
                            }
                          >
                            {fn.status}
                          </Badge>
                          {fn.runtime && (
                            <Badge variant="outline" className="text-xs">
                              {fn.runtime}
                            </Badge>
                          )}
                        </div>
                        {fn.lastDeployed && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Last deployed: {fn.lastDeployed}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInvokeName(fn.name)
                          }}
                          title="Invoke function"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Invocation Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-base">Test Invocation</CardTitle>
              </div>
              <CardDescription>
                Invoke a function with a test payload and view the response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Function Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Function Name
                  </label>
                  <Input
                    type="text"
                    placeholder="my-function"
                    value={invokeName}
                    onChange={(e) => setInvokeName(e.target.value)}
                    className="font-mono"
                  />
                </div>

                {/* Payload Editor */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Payload (JSON)
                  </label>
                  <Textarea
                    placeholder='{"key": "value"}'
                    value={invokePayload}
                    onChange={(e) => setInvokePayload(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Optional JSON payload to pass to the function
                  </p>
                </div>

                {/* Invoke Button */}
                <Button
                  onClick={invokeFunction}
                  disabled={invoking || !invokeName}
                >
                  {invoking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Invoke Function
                </Button>

                {/* Invocation Result */}
                {invokeResult && (
                  <div className="rounded-lg bg-zinc-950 p-4">
                    <div className="mb-2 text-xs font-medium text-zinc-400">
                      Response
                    </div>
                    <ScrollArea className="max-h-48">
                      <pre className="font-mono text-xs text-zinc-300">
                        {invokeResult}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deploy Status Tab */}
        <TabsContent value="deploy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-base">
                  Real-Time Deployment Status
                </CardTitle>
              </div>
              <CardDescription>
                Track deployment progress for all functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deploymentStatus.length === 0 ? (
                <div className="py-8 text-center">
                  <Rocket className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                  <p className="text-sm text-zinc-500">
                    No active deployments. Click &ldquo;Deploy&rdquo; to start.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deploymentStatus.map((deploy, index) => (
                    <div
                      key={`${deploy.functionName}-${index}`}
                      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-medium">
                            {deploy.functionName}
                          </code>
                          <Badge
                            variant={
                              deploy.status === 'success'
                                ? 'default'
                                : deploy.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {deploy.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-zinc-500">
                          {deploy.progress}%
                        </span>
                      </div>
                      <Progress value={deploy.progress} className="mb-2" />
                      <p className="text-xs text-zinc-500">{deploy.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-base">
                  Function Invocation Metrics
                </CardTitle>
              </div>
              <CardDescription>
                Performance and error tracking for function invocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {functions.length === 0 ? (
                  <div className="py-8 text-center">
                    <Activity className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                    <p className="text-sm text-zinc-500">
                      No function metrics available yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {functions.map((fn) => (
                      <div
                        key={fn.name}
                        className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <code className="text-sm font-medium">{fn.name}</code>
                          <Badge variant="outline">{fn.runtime}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-500 dark:text-zinc-400">
                              Invocations
                            </p>
                            <p className="font-semibold">
                              {(fn.invocations || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-zinc-500 dark:text-zinc-400">
                              Avg Duration
                            </p>
                            <p className="font-semibold">
                              {fn.avgDuration || 0}ms
                            </p>
                          </div>
                          <div>
                            <p className="text-zinc-500 dark:text-zinc-400">
                              Error Rate
                            </p>
                            <p
                              className={`font-semibold ${(fn.errorRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}
                            >
                              {(fn.errorRate || 0).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-zinc-500" />
                  <CardTitle className="text-base">
                    Function Logs with Filtering
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={logLevel} onValueChange={handleFilterLogs}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Logs</SelectItem>
                      <SelectItem value="error">Errors</SelectItem>
                      <SelectItem value="warn">Warnings</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={fetchLogs}>
                    {loadingLogs ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob(
                        [filteredLogs || logsOutput || ''],
                        { type: 'text/plain' },
                      )
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `function-logs-${new Date().toISOString()}.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              <CardDescription>
                Filter, search, and export function execution logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : filteredLogs || logsOutput ? (
                <ScrollArea className="h-96">
                  <pre className="text-xs text-zinc-700 dark:text-zinc-300">
                    {filteredLogs || logsOutput}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center">
                  <ScrollText className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                  <p className="text-sm text-zinc-500">
                    No logs available. Click &ldquo;Refresh&rdquo; to load logs.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-base">Function Templates</CardTitle>
              </div>
              <CardDescription>
                Start with pre-built function templates for common use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {template.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.runtime}
                      </Badge>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => {
                          setInvokeName(`new-${template.id}`)
                          setActiveTab('overview')
                        }}
                      >
                        <FileCode className="mr-2 h-4 w-4" />
                        Create from Template
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CLI Command Preview */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">CLI Command</CardTitle>
          </div>
          <CardDescription>
            Command executed against the nself CLI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 p-4">
            <div className="mb-2 font-mono text-sm text-emerald-400">
              $ {lastCommand}
            </div>
            {cliOutput && (
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-xs text-zinc-300">
                  {cliOutput}
                </pre>
              </ScrollArea>
            )}
            {!cliOutput && (
              <p className="font-mono text-xs text-zinc-500">
                Run a command to see output here
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

export default function FunctionsPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <FunctionsContent />
    </Suspense>
  )
}
