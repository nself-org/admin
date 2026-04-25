'use client'

/**
 * Push Notifications Dashboard — B19
 *
 * Overview: 7-day stats, campaigns tab, topics tab, DLR analytics tab.
 * Handles 7 UI states: loading, empty, error, populated, offline, permission-denied, rate-limited.
 */

import { DLRChart } from '@/components/notifications/DLRChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUrlState } from '@/hooks/useUrlState'
import {
  campaigns,
  NotifyApiError,
  receipts,
  topics,
  type Campaign,
  type CampaignStats,
  type DLRSummary,
  type Topic,
} from '@/lib/api/notifications'
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  Send,
  ShieldOff,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

type PageState =
  | 'loading'
  | 'offline'
  | 'permission-denied'
  | 'rate-limited'
  | 'error'
  | 'empty'
  | 'populated'

function deriveState(
  isLoading: boolean,
  error: unknown,
  hasData: boolean,
): PageState {
  if (isLoading) return 'loading'
  if (error instanceof NotifyApiError) {
    if (error.status === 401 || error.status === 403) return 'permission-denied'
    if (error.status === 429) return 'rate-limited'
  }
  if (error) return 'error'
  if (!hasData) return 'empty'
  return 'populated'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const statusIcon = {
    sent: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    scheduled: <Clock className="h-4 w-4 text-sky-500" />,
    sending: <Loader2 className="h-4 w-4 animate-spin text-sky-400" />,
    draft: <Bell className="h-4 w-4 text-zinc-400" />,
    canceled: <XCircle className="h-4 w-4 text-zinc-400" />,
  }[campaign.status] ?? <Bell className="h-4 w-4 text-zinc-400" />

  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
        {campaign.title}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className="text-zinc-600 capitalize dark:text-zinc-400">
            {campaign.status}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
        {campaign.sentAt
          ? new Date(campaign.sentAt).toLocaleDateString()
          : campaign.scheduledAt
            ? new Date(campaign.scheduledAt).toLocaleDateString()
            : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={`/notifications/send?campaignId=${campaign.id}`}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      </td>
    </tr>
  )
}

function TopicRow({
  topic,
  onDelete,
}: {
  topic: Topic
  onDelete: (id: string) => void
}) {
  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
        {topic.name}
      </td>
      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
        {topic.subscriberCount.toLocaleString()} subscribers
      </td>
      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
        {new Date(topic.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(topic.id)}
          className="text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Delete
        </Button>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// State banners
// ---------------------------------------------------------------------------

function StateBanner({
  state,
  error,
  onRetry,
}: {
  state: PageState
  error: unknown
  onRetry: () => void
}) {
  if (state === 'loading') {
    return (
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-label="Loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (state === 'offline') {
    return (
      <EmptyState
        icon={WifiOff}
        title="Offline"
        description="Push notification data is unavailable. Check your connection and try again."
        action={{ label: 'Retry', onClick: onRetry }}
      />
    )
  }

  if (state === 'permission-denied') {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Permission denied"
        description="You don't have access to push notification management. Contact your administrator."
      />
    )
  }

  if (state === 'rate-limited') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
              Rate limited
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Too many requests. Wait a moment and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-medium text-red-900 dark:text-red-100">
              Failed to load notifications
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function PushNotificationsDashboardContent() {
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'campaigns')
  const [campaignList, setCampaignList] = useState<Campaign[]>([])
  const [topicList, setTopicList] = useState<Topic[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [dlrData, setDlrData] = useState<DLRSummary[]>([])
  const [dlrDays, setDlrDays] = useState<7 | 30>(7)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [error, setError] = useState<unknown>(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [isCreatingTopic, setIsCreatingTopic] = useState(false)

  const load = useCallback(async () => {
    if (!isOnline) return
    setIsLoading(true)
    setError(null)
    try {
      const [campaignsRes, topicsRes, statsRes, dlrRes] = await Promise.all([
        campaigns.list({ pageSize: 20 }),
        topics.list(),
        campaigns.stats(),
        receipts.summary(dlrDays),
      ])
      setCampaignList(campaignsRes.items)
      setTopicList(topicsRes)
      setStats(statsRes)
      setDlrData(dlrRes)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, dlrDays])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      load()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [load])

  const hasData = campaignList.length > 0 || topicList.length > 0
  const pageState = !isOnline
    ? 'offline'
    : deriveState(isLoading, error, hasData)

  async function handleDeleteTopic(id: string) {
    try {
      await topics.delete(id)
      setTopicList((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err)
    }
  }

  async function handleCreateTopic() {
    if (!newTopicName.trim()) return
    setIsCreatingTopic(true)
    try {
      const topic = await topics.create(newTopicName.trim())
      setTopicList((prev) => [...prev, topic])
      setNewTopicName('')
    } catch (err) {
      setError(err)
    } finally {
      setIsCreatingTopic(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Push Notifications"
        description="Manage campaigns, topics, and delivery analytics"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Push Notifications' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
            {isOnline && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <Wifi className="h-3 w-3" />
                Online
              </span>
            )}
            <Link href="/notifications/send">
              <Button>
                <Send className="mr-2 h-4 w-4" />
                New campaign
              </Button>
            </Link>
          </div>
        }
      />

      <PageContent>
        {/* Offline banner */}
        {!isOnline && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              You are offline. Showing cached data where available.
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Sent (7d)"
            value={stats?.sent.toLocaleString() ?? '—'}
            icon={Send}
            iconColor="bg-sky-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Delivery rate"
            value={stats ? `${stats.deliveryRate}%` : '—'}
            icon={CheckCircle}
            iconColor="bg-green-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Failed"
            value={stats?.failed.toLocaleString() ?? '—'}
            icon={XCircle}
            iconColor="bg-red-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Scheduled"
            value={stats?.scheduled.toLocaleString() ?? '—'}
            icon={Clock}
            iconColor="bg-amber-500"
            isLoading={isLoading}
          />
        </div>

        {/* State banners for non-populated states */}
        {pageState !== 'populated' && pageState !== 'empty' && (
          <StateBanner state={pageState} error={error} onRetry={load} />
        )}

        {/* Tabs — only show when loaded (even if empty) */}
        {(pageState === 'populated' || pageState === 'empty') && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="campaigns">
                Campaigns
                <Badge className="ml-2 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {campaignList.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="topics">
                Topics
                <Badge className="ml-2 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {topicList.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="dlr">DLR Analytics</TabsTrigger>
              <TabsTrigger value="devices">
                <Link
                  href="/notifications/devices"
                  className="flex items-center"
                >
                  Devices
                </Link>
              </TabsTrigger>
            </TabsList>

            {/* Campaigns tab */}
            <TabsContent value="campaigns">
              <Card>
                {campaignList.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title="No campaigns yet"
                    description="Create your first push notification campaign to reach your users."
                    action={{
                      label: 'New campaign',
                      onClick: () =>
                        window.location.assign('/notifications/send'),
                    }}
                    className="border-0"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-zinc-200 text-xs text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 text-left">Name</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {campaignList.map((c) => (
                          <CampaignRow key={c.id} campaign={c} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Topics tab */}
            <TabsContent value="topics">
              <Card>
                {/* New topic form */}
                <div className="flex gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
                    placeholder="New topic name"
                    className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateTopic}
                    disabled={isCreatingTopic || !newTopicName.trim()}
                  >
                    {isCreatingTopic ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {topicList.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="No topics"
                    description="Topics let you group subscribers. Add one above."
                    className="border-0"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-zinc-200 text-xs text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 text-left">Topic</th>
                          <th className="px-4 py-3 text-left">Subscribers</th>
                          <th className="px-4 py-3 text-left">Created</th>
                          <th className="px-4 py-3 text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {topicList.map((t) => (
                          <TopicRow
                            key={t.id}
                            topic={t}
                            onDelete={handleDeleteTopic}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* DLR Analytics tab */}
            <TabsContent value="dlr">
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Delivery trends
                  </h2>
                  <div className="flex gap-2">
                    {([7, 30] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDlrDays(d)}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                          dlrDays === d
                            ? 'bg-sky-500 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <DLRChart data={dlrData} isLoading={isLoading} />

                {dlrData.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <a
                      href={receipts.exportCsv()}
                      download="dlr-report.csv"
                      className="text-sm text-sky-500 hover:text-sky-400"
                    >
                      Export CSV
                    </a>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Devices tab — link to full page */}
            <TabsContent value="devices">
              <Card className="p-6 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">
                  <Link
                    href="/notifications/devices"
                    className="text-sky-500 hover:text-sky-400"
                  >
                    View full device token health page
                  </Link>
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </PageContent>
    </>
  )
}

export default function PushNotificationsDashboard() {
  return (
    <Suspense>
      <PushNotificationsDashboardContent />
    </Suspense>
  )
}
