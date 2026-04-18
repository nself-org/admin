'use client'

/**
 * RatingWidget — displays aggregate star rating, allows submitting a new
 * rating/review, and shows a list of recent reviews.
 */

import type { PluginRatings, PluginReview } from '@/types/plugins'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export interface RatingWidgetProps {
  pluginName: string
  initialRating?: number
  initialReviewCount?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarDisplay({
  rating,
  size = 'sm',
}: {
  rating: number
  size?: 'sm' | 'md'
}) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  const cls = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5'

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star
          key={`f${i}`}
          className={`${cls} fill-yellow-400 text-yellow-400`}
        />
      ))}
      {half && (
        <Star
          key="half"
          className={`${cls} fill-yellow-400/50 text-yellow-400`}
        />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star
          key={`e${i}`}
          className={`${cls} fill-transparent text-zinc-600`}
        />
      ))}
    </div>
  )
}

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Rate this plugin"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hovered || value)
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n !== 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-zinc-600 hover:text-yellow-300'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

function ReviewRow({ review }: { review: PluginReview }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 p-3">
      <div className="flex items-center justify-between">
        <StarDisplay rating={review.rating} />
        <span className="text-xs text-zinc-500">
          {formatRelative(review.createdAt)}
        </span>
      </div>
      {review.comment && (
        <p className="text-sm leading-relaxed text-zinc-300">
          {review.comment}
        </p>
      )}
      <p className="text-xs text-zinc-600">
        by {review.user.slice(0, 8)}&hellip;
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-32 rounded bg-zinc-700/50" />
      <div className="h-20 w-full rounded-lg bg-zinc-700/50" />
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-zinc-700/50" />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RatingWidget({
  pluginName,
  initialRating = 0,
  initialReviewCount = 0,
}: RatingWidgetProps) {
  const [data, setData] = useState<PluginRatings | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Rating form state
  const [selectedRating, setSelectedRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Reviews expand/collapse
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchRatings() {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(
          `/api/plugins/${encodeURIComponent(pluginName)}/ratings`,
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const body = (await res.json()) as PluginRatings & { success?: boolean }
        if (!cancelled) {
          setData({
            name: body.name ?? pluginName,
            rating:
              typeof body.rating === 'number' ? body.rating : initialRating,
            reviewCount:
              typeof body.reviewCount === 'number'
                ? body.reviewCount
                : initialReviewCount,
            reviews: Array.isArray(body.reviews) ? body.reviews : [],
          })
        }
      } catch (err) {
        if (!cancelled) {
          const e = err as { message?: string }
          setFetchError(e.message ?? 'Failed to load ratings')
          // Still show something useful with initial props
          setData({
            name: pluginName,
            rating: initialRating,
            reviewCount: initialReviewCount,
            reviews: [],
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchRatings()
    return () => {
      cancelled = true
    }
  }, [pluginName, initialRating, initialReviewCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedRating === 0) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(
        `/api/plugins/${encodeURIComponent(pluginName)}/ratings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: selectedRating,
            comment: comment.trim() || undefined,
          }),
        },
      )

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }

      setSubmitted(true)
      // Re-fetch to show updated aggregate
      const updated = await fetch(
        `/api/plugins/${encodeURIComponent(pluginName)}/ratings`,
      )
      if (updated.ok) {
        const updatedBody = (await updated.json()) as PluginRatings
        setData({
          name: updatedBody.name ?? pluginName,
          rating: updatedBody.rating ?? 0,
          reviewCount: updatedBody.reviewCount ?? 0,
          reviews: Array.isArray(updatedBody.reviews)
            ? updatedBody.reviews
            : [],
        })
      }
    } catch (err) {
      const e = err as { message?: string }
      setSubmitError(e.message ?? 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  const aggregate = data ?? {
    name: pluginName,
    rating: initialRating,
    reviewCount: initialReviewCount,
    reviews: [],
  }
  const visibleReviews = showAll
    ? aggregate.reviews
    : aggregate.reviews.slice(0, 5)
  const hasMoreReviews = aggregate.reviews.length > 5

  return (
    <div className="space-y-6">
      {/* Aggregate rating */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-white">
          {aggregate.rating > 0 ? aggregate.rating.toFixed(1) : '—'}
        </span>
        <div className="space-y-0.5">
          <StarDisplay rating={aggregate.rating} size="md" />
          <p className="text-xs text-zinc-500">
            {aggregate.reviewCount === 0
              ? 'No reviews yet'
              : `${aggregate.reviewCount} review${aggregate.reviewCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Could not reach ratings service. Showing cached data.
        </div>
      )}

      {/* Rate this plugin form */}
      <div className="space-y-4 rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4">
        <h3 className="text-sm font-semibold text-white">Rate this plugin</h3>

        {submitted ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Star className="h-4 w-4 fill-emerald-400" />
            Thanks for your rating!
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="space-y-3"
          >
            <StarPicker value={selectedRating} onChange={setSelectedRating} />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Optional: share your experience (max 500 chars)"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {comment.length}/500
              </span>
              <button
                type="submit"
                disabled={selectedRating === 0 || submitting}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit rating'
                )}
              </button>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Reviews list */}
      {aggregate.reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Recent reviews</h3>
          <div className="space-y-2">
            {visibleReviews.map((review, idx) => (
              <ReviewRow key={`${review.user}-${idx}`} review={review} />
            ))}
          </div>

          {hasMoreReviews && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show fewer reviews
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all {aggregate.reviewCount} reviews
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
