'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ActionType, WorkflowAction } from '@/types/workflow'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Clock,
  Code,
  Database,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  RefreshCw,
  Terminal,
  Variable,
  Workflow,
  X,
} from 'lucide-react'
import * as React from 'react'

interface WorkflowActionConfigProps {
  action: WorkflowAction
  onChange: (action: WorkflowAction) => void
  onClose?: () => void
}

const actionIcons: Record<ActionType, React.ReactNode> = {
  http_request: <Globe className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />,
  database_query: <Database className="h-4 w-4" />,
  run_command: <Terminal className="h-4 w-4" />,
  transform_data: <Code className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  loop: <RefreshCw className="h-4 w-4" />,
  delay: <Clock className="h-4 w-4" />,
  parallel: <ArrowRight className="h-4 w-4" />,
  set_variable: <Variable className="h-4 w-4" />,
  log: <Terminal className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  workflow: <Workflow className="h-4 w-4" />,
}

export function WorkflowActionConfig({ action, onChange, onClose }: WorkflowActionConfigProps) {
  const updateConfig = (key: string, value: unknown) => {
    onChange({
      ...action,
      config: { ...action.config, [key]: value },
    })
  }

  const renderActionConfig = () => {
    switch (action.type) {
      case 'http_request':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={(action.config.method as string) || 'GET'}
                  onValueChange={(value) => updateConfig('method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://api.example.com/endpoint"
                  value={(action.config.url as string) || ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Headers (JSON)</Label>
              <Textarea
                placeholder='{ "Authorization": "Bearer {{token}}" }'
                value={action.config.headers ? JSON.stringify(action.config.headers, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const headers = e.target.value ? JSON.parse(e.target.value) : undefined
                    updateConfig('headers', headers)
                  } catch (_error) {
                    // Invalid JSON
                  }
                }}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                placeholder='{ "data": "{{input}}" }'
                value={action.config.body ? JSON.stringify(action.config.body, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const body = e.target.value ? JSON.parse(e.target.value) : undefined
                    updateConfig('body', body)
                  } catch (_error) {
                    // Invalid JSON
                  }
                }}
                rows={4}
              />
            </div>
          </div>
        )

      case 'email':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                placeholder="recipient@example.com"
                value={(action.config.to as string) || ''}
                onChange={(e) => updateConfig('to', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Email subject"
                value={(action.config.subject as string) || ''}
                onChange={(e) => updateConfig('subject', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Email body content..."
                value={(action.config.body as string) || ''}
                onChange={(e) => updateConfig('body', e.target.value)}
                rows={5}
              />
            </div>
          </div>
        )

      case 'slack':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://hooks.slack.com/services/..."
                value={(action.config.webhookUrl as string) || ''}
                onChange={(e) => updateConfig('webhookUrl', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Channel (optional)</Label>
              <Input
                placeholder="#general"
                value={(action.config.channel as string) || ''}
                onChange={(e) => updateConfig('channel', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Slack message content..."
                value={(action.config.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                rows={4}
              />
            </div>
          </div>
        )

      case 'database_query':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection</Label>
              <Select
                value={(action.config.connection as string) || 'default'}
                onValueChange={(value) => updateConfig('connection', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Query</Label>
              <Textarea
                placeholder="SELECT * FROM users WHERE id = $1"
                value={(action.config.query as string) || ''}
                onChange={(e) => updateConfig('query', e.target.value)}
                className="font-mono"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Parameters (JSON array)</Label>
              <Input
                placeholder='["{{userId}}"]'
                value={action.config.params ? JSON.stringify(action.config.params) : ''}
                onChange={(e) => {
                  try {
                    const params = e.target.value ? JSON.parse(e.target.value) : undefined
                    updateConfig('params', params)
                  } catch (_error) {
                    // Invalid JSON
                  }
                }}
              />
            </div>
          </div>
        )

      case 'run_command':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Command</Label>
              <Input
                placeholder="nself db backup"
                value={(action.config.command as string) || ''}
                onChange={(e) => updateConfig('command', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Working Directory (optional)</Label>
              <Input
                placeholder="/workspace"
                value={(action.config.cwd as string) || ''}
                onChange={(e) => updateConfig('cwd', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Environment Variables (JSON)</Label>
              <Textarea
                placeholder='{ "NODE_ENV": "production" }'
                value={action.config.env ? JSON.stringify(action.config.env, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const env = e.target.value ? JSON.parse(e.target.value) : undefined
                    updateConfig('env', env)
                  } catch (_error) {
                    // Invalid JSON
                  }
                }}
                rows={3}
              />
            </div>
          </div>
        )

      case 'transform_data':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transform Expression</Label>
              <Textarea
                placeholder="input.data.map(item => ({ ...item, processed: true }))"
                value={(action.config.expression as string) || ''}
                onChange={(e) => updateConfig('expression', e.target.value)}
                className="font-mono"
                rows={5}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                JavaScript expression. Use `input` to access the previous step&apos;s output.
              </p>
            </div>
          </div>
        )

      case 'condition':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Condition Expression</Label>
              <Input
                placeholder="input.status === 'success'"
                value={(action.config.condition as string) || ''}
                onChange={(e) => updateConfig('condition', e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                JavaScript expression that evaluates to true or false.
              </p>
            </div>
          </div>
        )

      case 'delay':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={(action.config.duration as number) || ''}
                  onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={(action.config.unit as string) || 'seconds'}
                  onValueChange={(value) => updateConfig('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milliseconds">Milliseconds</SelectItem>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'set_variable':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input
                placeholder="myVariable"
                value={(action.config.name as string) || ''}
                onChange={(e) => updateConfig('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Value Expression</Label>
              <Textarea
                placeholder="input.data.userId"
                value={(action.config.value as string) || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
                className="font-mono"
                rows={3}
              />
            </div>
          </div>
        )

      case 'log':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Log Level</Label>
              <Select
                value={(action.config.level as string) || 'info'}
                onValueChange={(value) => updateConfig('level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Processing user {{input.userId}}..."
                value={(action.config.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )

      default:
        return (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No configuration options available for this action type.
          </p>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              {actionIcons[action.type]}
            </div>
            <div>
              <CardTitle className="text-base">
                <Input
                  value={action.name}
                  onChange={(e) => onChange({ ...action, name: e.target.value })}
                  className="h-auto border-0 p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                />
              </CardTitle>
              <CardDescription className="capitalize">
                {action.type.replace(/_/g, ' ')}
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderActionConfig()}

        {/* Common settings */}
        <div className="border-t pt-4 dark:border-zinc-800">
          <h4 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Error Handling
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>On Error</Label>
              <Select
                value={action.onError || 'stop'}
                onValueChange={(value) =>
                  onChange({
                    ...action,
                    onError: value as 'stop' | 'continue' | 'retry',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop">Stop workflow</SelectItem>
                  <SelectItem value="continue">Continue</SelectItem>
                  <SelectItem value="retry">Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                placeholder="30000"
                value={action.timeout || ''}
                onChange={(e) =>
                  onChange({
                    ...action,
                    timeout: parseInt(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          {action.onError === 'retry' && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Retries</Label>
                <Input
                  type="number"
                  placeholder="3"
                  value={action.retryConfig?.maxRetries || ''}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      retryConfig: {
                        ...action.retryConfig,
                        maxRetries: parseInt(e.target.value) || 3,
                        retryDelay: action.retryConfig?.retryDelay || 1000,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Retry Delay (ms)</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={action.retryConfig?.retryDelay || ''}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      retryConfig: {
                        ...action.retryConfig,
                        maxRetries: action.retryConfig?.maxRetries || 3,
                        retryDelay: parseInt(e.target.value) || 1000,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Backoff Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="2"
                  value={action.retryConfig?.backoffMultiplier || ''}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      retryConfig: {
                        ...action.retryConfig,
                        maxRetries: action.retryConfig?.maxRetries || 3,
                        retryDelay: action.retryConfig?.retryDelay || 1000,
                        backoffMultiplier: parseFloat(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
