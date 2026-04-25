'use client'

/**
 * Campaign composer + send page — B19
 *
 * 7 UI states: loading, empty, error, populated, offline, permission-denied, rate-limited
 */

import { CampaignBuilder } from '@/components/notifications/CampaignBuilder'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import {
  campaigns,
  NotifyApiError,
  type Campaign,
} from '@/lib/api/notifications'
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Loader2,
  ShieldOff,
  WifiOff,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Inner component (needs useSearchParams inside Suspense)
// ---------------------------------------------------------------------------

function SendPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId')

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(!!campaignId)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [error, setError] = useState<unknown>(null)
  const [sent, setSent] = useState(false)

  const load = useCallback(async () => {
    if (!campaignId) return
    setIsLoading(true)
    setError(null)
    try {
      const c = await campaigns.get(campaignId)
      setCampaign(c)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      load()
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [load])

  // ---- State banners ----

  if (!isOnline) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Offline"
        description="You must be online to send push notifications."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (
    error instanceof NotifyApiError &&
    (error.status === 401 || error.status === 403)
  ) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Permission denied"
        description="You don't have permission to manage push notification campaigns."
      />
    )
  }

  if (error instanceof NotifyApiError && error.status === 429) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-yellow-800 dark:text-yellow-200">
            Rate limited. Wait a moment before sending another campaign.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-200">
            {error instanceof Error ? error.message : 'Failed to load campaign'}
          </p>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Campaign queued"
        description="Your push notification campaign has been submitted and will be sent shortly."
        action={{
          label: 'Back to notifications',
          onClick: () => router.push('/notifications'),
        }}
      />
    )
  }

  // Populated: show composer (pre-filled if editing existing campaign)
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {campaign ? `Edit: ${campaign.title}` : 'New campaign'}
      </h2>
      {!campaign && !campaignId && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-start gap-2">
            <Bell className="mt-0.5 h-4 w-4 text-sky-500" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Campaigns are sent via FCM (Android) and APNs (iOS) through the
              notify plugin. Make sure your credentials are configured in{' '}
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                .env
              </code>
              .
            </p>
          </div>
        </div>
      )}
      <CampaignBuilder
        onSuccess={() => setSent(true)}
        onCancel={() => router.push('/notifications')}
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export default function SendPage() {
  return (
    <>
      <PageHeader
        title="Campaign Composer"
        description="Create and send push notifications to your users"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Push Notifications', href: '/notifications' },
          { label: 'New Campaign' },
        ]}
      />
      <PageContent>
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center py-24"
              role="status"
            >
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          }
        >
          <SendPageContent />
        </Suspense>
      </PageContent>
    </>
  )
}
