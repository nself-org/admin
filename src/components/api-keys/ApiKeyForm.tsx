'use client'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
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
import type { ApiKey, ApiKeyScope, CreateApiKeyInput } from '@/types/api-key'
import { Loader2, Minus, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ApiKeyFormProps {
  /** Initial values for editing */
  initialValues?: Partial<ApiKey>
  /** Whether the form is in edit mode */
  isEditing?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Submit handler */
  onSubmit: (data: CreateApiKeyInput) => void | Promise<void>
  /** Cancel handler */
  onCancel?: () => void
}

const SCOPE_OPTIONS: {
  value: ApiKeyScope
  label: string
  description: string
}[] = [
  { value: 'read', label: 'Read Only', description: 'Can only read data' },
  {
    value: 'write',
    label: 'Read & Write',
    description: 'Can read and modify data',
  },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'custom', label: 'Custom', description: 'Custom permissions' },
]

const RATE_LIMIT_PRESETS = [
  { label: '100/min', requests: 100, window: 60 },
  { label: '1000/min', requests: 1000, window: 60 },
  { label: '10000/hour', requests: 10000, window: 3600 },
  { label: 'Unlimited', requests: 0, window: 0 },
]

export function ApiKeyForm({
  initialValues,
  isEditing = false,
  isLoading = false,
  onSubmit,
  onCancel,
}: ApiKeyFormProps) {
  const [name, setName] = useState(initialValues?.name || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [scope, setScope] = useState<ApiKeyScope>(initialValues?.scope || 'read')
  const [rateLimit, setRateLimit] = useState(
    initialValues?.rateLimit || { requests: 1000, window: 60 }
  )
  const [allowedIps, setAllowedIps] = useState<string[]>(initialValues?.allowedIps || [])
  const [newIp, setNewIp] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    initialValues?.expiresAt ? new Date(initialValues.expiresAt) : undefined
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters'
    } else if (name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters'
    }

    if (description && description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters'
    }

    if (rateLimit.requests > 0 && rateLimit.window <= 0) {
      newErrors.rateLimit = 'Window must be greater than 0 when rate limit is set'
    }

    // Validate IP addresses
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
    for (const ip of allowedIps) {
      if (!ipRegex.test(ip)) {
        newErrors.allowedIps = `Invalid IP address format: ${ip}`
        break
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [name, description, rateLimit, allowedIps])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const data: CreateApiKeyInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      scope,
      rateLimit: rateLimit.requests > 0 ? rateLimit : undefined,
      allowedIps: allowedIps.length > 0 ? allowedIps : undefined,
      expiresAt: expiresAt?.toISOString(),
    }

    await onSubmit(data)
  }

  const addIp = () => {
    const ip = newIp.trim()
    if (ip && !allowedIps.includes(ip)) {
      setAllowedIps([...allowedIps, ip])
      setNewIp('')
    }
  }

  const removeIp = (ipToRemove: string) => {
    setAllowedIps(allowedIps.filter((ip) => ip !== ipToRemove))
  }

  const handleRateLimitPreset = (preset: (typeof RATE_LIMIT_PRESETS)[number]) => {
    setRateLimit({ requests: preset.requests, window: preset.window })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Key"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this API key used for?"
          rows={3}
          disabled={isLoading}
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
        <p className="text-xs text-zinc-500">{description.length}/200 characters</p>
      </div>

      {/* Scope */}
      <div className="space-y-2">
        <Label>Scope</Label>
        <div className="relative">
          <Select value={scope} onValueChange={(value) => setScope(value as ApiKeyScope)}>
            <SelectTrigger disabled={isLoading}>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-zinc-500">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rate Limit */}
      <div className="space-y-2">
        <Label>Rate Limit</Label>
        <div className="flex flex-wrap gap-2">
          {RATE_LIMIT_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={
                rateLimit.requests === preset.requests && rateLimit.window === preset.window
                  ? 'default'
                  : 'outline'
              }
              size="sm"
              onClick={() => handleRateLimitPreset(preset)}
              disabled={isLoading}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="requests" className="text-xs text-zinc-500">
              Requests
            </Label>
            <Input
              id="requests"
              type="number"
              min="0"
              value={rateLimit.requests}
              onChange={(e) =>
                setRateLimit({
                  ...rateLimit,
                  requests: parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="window" className="text-xs text-zinc-500">
              Window (seconds)
            </Label>
            <Input
              id="window"
              type="number"
              min="0"
              value={rateLimit.window}
              onChange={(e) =>
                setRateLimit({
                  ...rateLimit,
                  window: parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
        </div>
        {errors.rateLimit && <p className="text-sm text-red-500">{errors.rateLimit}</p>}
      </div>

      {/* IP Whitelist */}
      <div className="space-y-2">
        <Label>IP Whitelist</Label>
        <p className="text-xs text-zinc-500">
          Leave empty to allow all IPs. CIDR notation supported (e.g., 192.168.1.0/24)
        </p>
        <div className="flex gap-2">
          <Input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="192.168.1.1 or 10.0.0.0/8"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addIp()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addIp} disabled={isLoading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {allowedIps.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {allowedIps.map((ip) => (
              <span
                key={ip}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-sm dark:bg-zinc-800"
              >
                <code>{ip}</code>
                <button
                  type="button"
                  onClick={() => removeIp(ip)}
                  className="text-zinc-500 hover:text-red-500"
                  disabled={isLoading}
                >
                  <Minus className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.allowedIps && <p className="text-sm text-red-500">{errors.allowedIps}</p>}
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <Label>Expiration Date</Label>
        <p className="text-xs text-zinc-500">Leave empty for no expiration</p>
        <DatePicker
          value={expiresAt}
          onChange={setExpiresAt}
          placeholder="Select expiration date"
          minDate={new Date()}
          disabled={isLoading}
        />
        {expiresAt && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpiresAt(undefined)}
            disabled={isLoading}
          >
            Clear expiration
          </Button>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update API Key' : 'Create API Key'}
        </Button>
      </div>
    </form>
  )
}
