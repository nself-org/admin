'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { campaigns, type CreateCampaignInput } from '@/lib/api/notifications'
import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'

export interface CampaignBuilderProps {
  onSuccess?: () => void
  onCancel?: () => void
}

type Target = 'all' | 'topic' | 'segment'
type Schedule = 'now' | 'later'

export function CampaignBuilder({ onSuccess, onCancel }: CampaignBuilderProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [target, setTarget] = useState<Target>('all')
  const [topicName, setTopicName] = useState('')
  const [segmentJson, setSegmentJson] = useState('')
  const [schedule, setSchedule] = useState<Schedule>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [batchSize, setBatchSize] = useState(500)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segmentError, setSegmentError] = useState<string | null>(null)

  function validateForm(): string | null {
    if (!title.trim()) return 'Title is required'
    if (!body.trim()) return 'Body is required'
    if (target === 'topic' && !topicName.trim()) return 'Topic name is required'
    if (target === 'segment') {
      try {
        JSON.parse(segmentJson)
      } catch {
        return 'Segment must be valid JSON'
      }
    }
    if (schedule === 'later' && !scheduledAt) return 'Schedule time is required'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSegmentError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      let segment: Record<string, unknown> | undefined
      if (target === 'segment') {
        segment = JSON.parse(segmentJson)
      }

      const input: CreateCampaignInput = {
        title: title.trim(),
        body: body.trim(),
        batchSize,
      }

      if (deepLink.trim()) {
        input.data = { url: deepLink.trim() }
      }
      if (target === 'topic') input.topic = topicName.trim()
      if (target === 'segment') input.segment = segment
      if (schedule === 'later') input.scheduledAt = scheduledAt

      const campaign = await campaigns.create(input)

      if (schedule === 'now') {
        await campaigns.send(campaign.id)
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      aria-label="Campaign builder"
    >
      {/* Title / Body */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="campaign-title">Title</Label>
          <Input
            id="campaign-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Push notification title"
            maxLength={100}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="campaign-body">Body</Label>
          <textarea
            id="campaign-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification message"
            maxLength={500}
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <Label htmlFor="campaign-deeplink">Deep-link URL (optional)</Label>
          <Input
            id="campaign-deeplink"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="myapp://screen/detail"
            className="mt-1"
          />
        </div>
      </div>

      {/* Target */}
      <div>
        <Label>Target</Label>
        <div className="mt-2 flex gap-2">
          {(['all', 'topic', 'segment'] as Target[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                target === t
                  ? 'bg-sky-500 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {target === 'topic' && (
          <Input
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Topic name (e.g. news)"
            className="mt-2"
          />
        )}
        {target === 'segment' && (
          <div className="mt-2">
            <textarea
              value={segmentJson}
              onChange={(e) => {
                setSegmentJson(e.target.value)
                try {
                  JSON.parse(e.target.value)
                  setSegmentError(null)
                } catch {
                  setSegmentError('Invalid JSON')
                }
              }}
              placeholder='{"country": "US"}'
              rows={3}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {segmentError && (
              <p className="mt-1 text-xs text-red-500">{segmentError}</p>
            )}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div>
        <Label>Schedule</Label>
        <div className="mt-2 flex gap-2">
          {(['now', 'later'] as Schedule[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSchedule(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                schedule === s
                  ? 'bg-sky-500 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {s === 'now' ? 'Send now' : 'Schedule'}
            </button>
          ))}
        </div>
        {schedule === 'later' && (
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="mt-2"
          />
        )}
      </div>

      {/* Batch size */}
      <div>
        <Label htmlFor="batch-size">
          Batch size: <span className="font-bold">{batchSize}</span>
        </Label>
        <input
          id="batch-size"
          type="range"
          min={100}
          max={1000}
          step={100}
          value={batchSize}
          onChange={(e) => setBatchSize(Number(e.target.value))}
          className="mt-2 w-full"
        />
        <div className="flex justify-between text-xs text-zinc-400">
          <span>100</span>
          <span>1000</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {schedule === 'now' ? 'Send now' : 'Schedule'}
        </Button>
      </div>
    </form>
  )
}
