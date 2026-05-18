'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Edit, RotateCw, Save } from 'lucide-react'
import { useState } from 'react'

interface ServiceConfigSectionProps {
  serviceName: string
  config: string
  onSave?: (newConfig: string) => Promise<void>
  editable?: boolean
  restartRequired?: boolean
}

export function ServiceConfigSection({
  serviceName,
  config,
  onSave,
  editable = true,
  restartRequired = true,
}: ServiceConfigSectionProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(config)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleEdit = () => {
    setEditing(true)
    setValue(config)
    setHasChanges(false)
  }

  const handleCancel = () => {
    setEditing(false)
    setValue(config)
    setHasChanges(false)
  }

  const handleChange = (newValue: string) => {
    setValue(newValue)
    setHasChanges(newValue !== config)
  }

  const handleSave = async () => {
    if (!onSave || !hasChanges) return

    setSaving(true)
    try {
      await onSave(value)
      setEditing(false)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{serviceName} Configuration</CardTitle>
          <div className="flex gap-2">
            {!editing && editable && (
              <Button onClick={handleEdit} variant="outline">
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges || saving}>
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {restartRequired && hasChanges && (
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Restart Required</AlertTitle>
            <AlertDescription>
              Changes to this configuration require a service restart to take effect.
              <Button variant="link" className="ml-2 h-auto p-0">
                <RotateCw className="mr-1 h-3 w-3" />
                Restart {serviceName}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {editing ? (
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="Enter configuration..."
          />
        ) : (
          <pre className="overflow-auto rounded-lg bg-zinc-50 p-4 font-mono text-sm dark:bg-zinc-900">
            {config || 'No configuration available'}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
