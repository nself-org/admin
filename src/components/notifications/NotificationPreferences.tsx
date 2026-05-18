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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useNotificationPreferences, useUpdatePreferences } from '@/hooks/useNotifications'
import type { NotificationPreferences } from '@/types/notification'
import { Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'UTC',
]

const DIGEST_FREQUENCIES = [
  { value: 'instant', label: 'Instant (no digest)' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
]

export function NotificationPreferences() {
  const { preferences, isLoading, refresh } = useNotificationPreferences()
  const { updatePreferences, isLoading: isSaving } = useUpdatePreferences()

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize local state when preferences load
  useEffect(() => {
    if (preferences && !localPrefs) {
      setLocalPrefs(preferences)
    }
  }, [preferences, localPrefs])

  const handleChannelToggle = (channel: keyof NotificationPreferences['channels']) => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      channels: {
        ...localPrefs.channels,
        [channel]: !localPrefs.channels[channel],
      },
    })
    setHasChanges(true)
  }

  const handleDigestToggle = () => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      digest: {
        ...localPrefs.digest,
        enabled: !localPrefs.digest.enabled,
      },
    })
    setHasChanges(true)
  }

  const handleDigestFrequencyChange = (value: string) => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      digest: {
        ...localPrefs.digest,
        frequency: value as NotificationPreferences['digest']['frequency'],
      },
    })
    setHasChanges(true)
  }

  const handleDigestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      digest: {
        ...localPrefs.digest,
        time: e.target.value,
      },
    })
    setHasChanges(true)
  }

  const handleQuietHoursToggle = () => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      quietHours: {
        ...localPrefs.quietHours,
        enabled: !localPrefs.quietHours.enabled,
      },
    })
    setHasChanges(true)
  }

  const handleQuietHoursTimeChange = (field: 'start' | 'end', value: string) => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      quietHours: {
        ...localPrefs.quietHours,
        [field]: value,
      },
    })
    setHasChanges(true)
  }

  const handleTimezoneChange = (value: string) => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      quietHours: {
        ...localPrefs.quietHours,
        timezone: value,
      },
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!localPrefs) return

    await updatePreferences(localPrefs)
    setHasChanges(false)
    refresh()
  }

  if (isLoading || !localPrefs) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="channel-in_app">In-App Notifications</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Show notifications in the nAdmin interface
              </p>
            </div>
            <Switch
              id="channel-in_app"
              checked={localPrefs.channels.in_app}
              onCheckedChange={() => handleChannelToggle('in_app')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="channel-email">Email Notifications</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="channel-email"
              checked={localPrefs.channels.email}
              onCheckedChange={() => handleChannelToggle('email')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="channel-push">Push Notifications</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Browser push notifications (when supported)
              </p>
            </div>
            <Switch
              id="channel-push"
              checked={localPrefs.channels.push}
              onCheckedChange={() => handleChannelToggle('push')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="channel-slack">Slack Notifications</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Send notifications to a Slack channel
              </p>
            </div>
            <Switch
              id="channel-slack"
              checked={localPrefs.channels.slack}
              onCheckedChange={() => handleChannelToggle('slack')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="channel-webhook">Webhook Notifications</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Send notifications to a custom webhook URL
              </p>
            </div>
            <Switch
              id="channel-webhook"
              checked={localPrefs.channels.webhook}
              onCheckedChange={() => handleChannelToggle('webhook')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Digest Settings</CardTitle>
          <CardDescription>Configure how notifications are bundled and delivered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="digest-enabled">Enable Digest</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Bundle multiple notifications into a single digest
              </p>
            </div>
            <Switch
              id="digest-enabled"
              checked={localPrefs.digest.enabled}
              onCheckedChange={handleDigestToggle}
            />
          </div>

          {localPrefs.digest.enabled && (
            <>
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="digest-frequency">Digest Frequency</Label>
                  <Select
                    value={localPrefs.digest.frequency}
                    onValueChange={handleDigestFrequencyChange}
                  >
                    <SelectTrigger id="digest-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIGEST_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {localPrefs.digest.frequency !== 'instant' && (
                  <div className="space-y-2">
                    <Label htmlFor="digest-time">Delivery Time</Label>
                    <Input
                      id="digest-time"
                      type="time"
                      value={localPrefs.digest.time || '09:00'}
                      onChange={handleDigestTimeChange}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Time when digest will be sent
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Set times when you don&apos;t want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-enabled">Enable Quiet Hours</Label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Pause notifications during specified hours
              </p>
            </div>
            <Switch
              id="quiet-enabled"
              checked={localPrefs.quietHours.enabled}
              onCheckedChange={handleQuietHoursToggle}
            />
          </div>

          {localPrefs.quietHours.enabled && (
            <>
              <Separator />

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={localPrefs.quietHours.start || '22:00'}
                    onChange={(e) => handleQuietHoursTimeChange('start', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={localPrefs.quietHours.end || '08:00'}
                    onChange={(e) => handleQuietHoursTimeChange('end', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-timezone">Timezone</Label>
                  <Select
                    value={localPrefs.quietHours.timezone}
                    onValueChange={handleTimezoneChange}
                  >
                    <SelectTrigger id="quiet-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  )
}
