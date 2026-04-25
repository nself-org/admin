'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/useReports'
import type {
  ReportFormat,
  ReportSchedule,
  ReportScheduleFrequency,
} from '@/types/report'
import {
  AlertCircle,
  Calendar,
  Clock,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  Save,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ReportScheduleFormProps {
  reportId: string
  existingSchedule?: ReportSchedule
  onSaved?: (schedule: ReportSchedule) => void
  onCancel?: () => void
}

const frequencyOptions: { value: ReportScheduleFrequency; label: string }[] = [
  { value: 'once', label: 'Run once' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const dayOfWeekOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileJson className="h-4 w-4" />,
  html: <FileText className="h-4 w-4" />,
}

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
]

export function ReportScheduleForm({
  reportId,
  existingSchedule,
  onSaved,
  onCancel,
}: ReportScheduleFormProps) {
  const { create, isCreating } = useCreateSchedule()
  const { update, isUpdating } = useUpdateSchedule()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [frequency, setFrequency] = useState<ReportScheduleFrequency>(
    existingSchedule?.frequency || 'daily',
  )
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    existingSchedule?.dayOfWeek ?? 1,
  )
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    existingSchedule?.dayOfMonth ?? 1,
  )
  const [time, setTime] = useState<string>(existingSchedule?.time || '09:00')
  const [timezone, setTimezone] = useState<string>(
    existingSchedule?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [format, setFormat] = useState<ReportFormat>(
    existingSchedule?.format || 'pdf',
  )
  const [recipients, setRecipients] = useState<string>(
    existingSchedule?.recipients.join(', ') || '',
  )
  const [enabled, setEnabled] = useState<boolean>(
    existingSchedule?.enabled ?? true,
  )

  // Update form when existingSchedule changes
  useEffect(() => {
    if (existingSchedule) {
      setFrequency(existingSchedule.frequency)
      setDayOfWeek(existingSchedule.dayOfWeek ?? 1)
      setDayOfMonth(existingSchedule.dayOfMonth ?? 1)
      setTime(existingSchedule.time)
      setTimezone(existingSchedule.timezone)
      setFormat(existingSchedule.format)
      setRecipients(existingSchedule.recipients.join(', '))
      setEnabled(existingSchedule.enabled)
    }
  }, [existingSchedule])

  const isSubmitting = isCreating || isUpdating

  const validateForm = (): boolean => {
    if (!recipients.trim()) {
      setError('At least one recipient email is required')
      return false
    }

    const emails = recipients.split(',').map((e) => e.trim())
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter((e) => !emailRegex.test(e))
    if (invalidEmails.length > 0) {
      setError(`Invalid email addresses: ${invalidEmails.join(', ')}`)
      return false
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      setError('Please enter a valid time in HH:MM format')
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    const scheduleData = {
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      time,
      timezone,
      format,
      recipients: recipients.split(',').map((e) => e.trim()),
      enabled,
    }

    try {
      let result: ReportSchedule | undefined

      if (existingSchedule) {
        result = await update(existingSchedule.id, scheduleData)
      } else {
        result = await create(reportId, scheduleData)
      }

      if (result) {
        onSaved?.(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    }
  }

  const getNextRunDescription = (): string => {
    const _now = new Date()

    switch (frequency) {
      case 'once':
        return `Will run once at ${time} ${timezone}`
      case 'hourly':
        return `Runs every hour at ${time.split(':')[1]} minutes past`
      case 'daily':
        return `Runs daily at ${time} ${timezone}`
      case 'weekly':
        return `Runs every ${dayOfWeekOptions[dayOfWeek].label} at ${time} ${timezone}`
      case 'monthly':
        return `Runs on day ${dayOfMonth} of each month at ${time} ${timezone}`
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Frequency Selection */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Calendar className="h-4 w-4" />
            Schedule Frequency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {frequencyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFrequency(option.value)}
                className={`rounded-lg border p-3 text-center text-sm transition-all ${
                  frequency === option.value
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Day of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-zinc-400">Day of Week</Label>
              <Select
                value={String(dayOfWeek)}
                onValueChange={(value) => setDayOfWeek(Number(value))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOfWeekOptions.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div className="space-y-2">
              <Label className="text-zinc-400">Day of Month</Label>
              <Select
                value={String(dayOfMonth)}
                onValueChange={(value) => setDayOfMonth(Number(value))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time and Timezone */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Clock className="h-4 w-4" />
            Time Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="time" className="text-zinc-400">
                Time (HH:MM)
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border-zinc-700 bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            {getNextRunDescription()}
          </p>
        </CardContent>
      </Card>

      {/* Output Format */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Output Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(formatIcons) as ReportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                  format === fmt
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div
                  className={
                    format === fmt ? 'text-emerald-400' : 'text-zinc-400'
                  }
                >
                  {formatIcons[fmt]}
                </div>
                <span
                  className={`text-xs ${format === fmt ? 'text-white' : 'text-zinc-400'}`}
                >
                  {fmt.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Mail className="h-4 w-4" />
            Email Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="recipients" className="text-zinc-400">
            Email addresses (comma-separated)
          </Label>
          <Input
            id="recipients"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="user1@example.com, user2@example.com"
            className="border-zinc-700 bg-zinc-900"
          />
          <p className="text-xs text-zinc-500">
            The report will be sent to these email addresses when generated.
          </p>
        </CardContent>
      </Card>

      {/* Enable/Disable */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
            />
            <div>
              <Label htmlFor="enabled" className="font-medium text-white">
                Enable schedule
              </Label>
              <p className="text-sm text-zinc-500">
                {enabled
                  ? 'Reports will be generated automatically'
                  : 'Schedule is paused'}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </CardContent>
      </Card>

      {/* Existing Schedule Info */}
      {existingSchedule && (
        <Card className="border-zinc-700/50 bg-zinc-800/50">
          <CardContent className="p-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {existingSchedule.lastRun && (
                <div>
                  <span className="text-zinc-500">Last run:</span>{' '}
                  <span className="text-white">
                    {new Date(existingSchedule.lastRun).toLocaleString()}
                  </span>
                </div>
              )}
              {existingSchedule.nextRun && (
                <div>
                  <span className="text-zinc-500">Next run:</span>{' '}
                  <span className="text-white">
                    {new Date(existingSchedule.nextRun).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="gap-2 bg-emerald-600 hover:bg-emerald-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {existingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
