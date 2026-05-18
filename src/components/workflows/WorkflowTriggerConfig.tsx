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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { TriggerType, WorkflowTrigger } from '@/types/workflow'
import { Calendar, Globe, Play, Trash2, Webhook, Workflow, Zap } from 'lucide-react'
import * as React from 'react'

interface WorkflowTriggerConfigProps {
  triggers: WorkflowTrigger[]
  onChange: (triggers: WorkflowTrigger[]) => void
}

const triggerTypes: {
  type: TriggerType
  label: string
  icon: React.ReactNode
}[] = [
  { type: 'manual', label: 'Manual', icon: <Play className="h-4 w-4" /> },
  {
    type: 'schedule',
    label: 'Schedule',
    icon: <Calendar className="h-4 w-4" />,
  },
  { type: 'webhook', label: 'Webhook', icon: <Webhook className="h-4 w-4" /> },
  { type: 'event', label: 'Event', icon: <Zap className="h-4 w-4" /> },
  { type: 'api', label: 'API', icon: <Globe className="h-4 w-4" /> },
  {
    type: 'workflow',
    label: 'Sub-workflow',
    icon: <Workflow className="h-4 w-4" />,
  },
]

export function WorkflowTriggerConfig({ triggers, onChange }: WorkflowTriggerConfigProps) {
  const addTrigger = (type: TriggerType) => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Trigger`,
      config: {},
      enabled: true,
    }
    onChange([...triggers, newTrigger])
  }

  const updateTrigger = (id: string, updates: Partial<WorkflowTrigger>) => {
    onChange(triggers.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const removeTrigger = (id: string) => {
    onChange(triggers.filter((t) => t.id !== id))
  }

  const renderTriggerConfig = (trigger: WorkflowTrigger) => {
    switch (trigger.type) {
      case 'schedule':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <Input
                placeholder="0 0 * * *"
                value={trigger.config.cron || ''}
                onChange={(e) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, cron: e.target.value },
                  })
                }
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Use cron syntax (e.g., &quot;0 0 * * *&quot; for daily at midnight)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={trigger.config.timezone || 'UTC'}
                onValueChange={(value) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, timezone: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'webhook':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook Path</Label>
              <Input
                placeholder="/api/webhooks/my-workflow"
                value={trigger.config.path || ''}
                onChange={(e) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, path: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select
                value={trigger.config.method || 'POST'}
                onValueChange={(value) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, method: value },
                  })
                }
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
            <div className="space-y-2">
              <Label>Secret (optional)</Label>
              <Input
                type="password"
                placeholder="Webhook signing secret"
                value={trigger.config.secret || ''}
                onChange={(e) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, secret: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )

      case 'event':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Input
                placeholder="user.created"
                value={trigger.config.eventType || ''}
                onChange={(e) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, eventType: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Event Source (optional)</Label>
              <Input
                placeholder="auth-service"
                value={trigger.config.eventSource || ''}
                onChange={(e) =>
                  updateTrigger(trigger.id, {
                    config: { ...trigger.config, eventSource: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Filter Expression (optional)</Label>
              <Textarea
                placeholder='{ "user.role": "admin" }'
                value={trigger.config.filter ? JSON.stringify(trigger.config.filter, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const filter = e.target.value ? JSON.parse(e.target.value) : undefined
                    updateTrigger(trigger.id, {
                      config: { ...trigger.config, filter },
                    })
                  } catch (_error) {
                    // Invalid JSON, ignore
                  }
                }}
                rows={3}
              />
            </div>
          </div>
        )

      case 'manual':
      case 'api':
        return (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This trigger can be activated{' '}
            {trigger.type === 'manual' ? 'manually from the UI' : 'via the API'}.
          </p>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Triggers</h3>
      </div>

      {triggers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Zap className="mb-4 h-8 w-8 text-zinc-400" />
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              No triggers configured. Add a trigger to start your workflow.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {triggers.map((trigger) => (
            <Card key={trigger.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {triggerTypes.find((t) => t.type === trigger.type)?.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        <Input
                          value={trigger.name}
                          onChange={(e) => updateTrigger(trigger.id, { name: e.target.value })}
                          className="h-auto border-0 p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                        />
                      </CardTitle>
                      <CardDescription className="capitalize">
                        {trigger.type} trigger
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={trigger.enabled}
                      onCheckedChange={(checked) => updateTrigger(trigger.id, { enabled: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400"
                      onClick={() => removeTrigger(trigger.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>{renderTriggerConfig(trigger)}</CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add trigger dropdown */}
      <div className="flex flex-wrap gap-2">
        {triggerTypes.map(({ type, label, icon }) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addTrigger(type)}>
            {icon}
            <span className="ml-2">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
