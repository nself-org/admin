'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUrlState } from '@/hooks/useUrlState'
import {
  Activity,
  Circle,
  Hash,
  Loader2,
  Lock,
  Play,
  Radio,
  RefreshCw,
  Send,
  Terminal,
  User,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Channel {
  name: string
  type: 'public' | 'private' | 'presence' | 'direct'
  subscribers: number
  messagesPerMin: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHANNEL_TYPES = [
  {
    type: 'public' as const,
    label: 'Public',
    icon: Hash,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    description: 'Open channels anyone can subscribe to',
  },
  {
    type: 'private' as const,
    label: 'Private',
    icon: Lock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    description: 'Authenticated channels with access control',
  },
  {
    type: 'presence' as const,
    label: 'Presence',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'Track online/offline status of members',
  },
  {
    type: 'direct' as const,
    label: 'Direct',
    icon: User,
    color: 'text-sky-500 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    description: 'Private one-to-one messaging channels',
  },
]

const MOCK_CHANNELS: Channel[] = [
  { name: 'general', type: 'public', subscribers: 24, messagesPerMin: 8 },
  {
    name: 'notifications',
    type: 'public',
    subscribers: 156,
    messagesPerMin: 42,
  },
  { name: 'admin-updates', type: 'private', subscribers: 5, messagesPerMin: 2 },
  { name: 'team-chat', type: 'private', subscribers: 12, messagesPerMin: 15 },
  { name: 'lobby', type: 'presence', subscribers: 38, messagesPerMin: 6 },
  {
    name: 'support-room',
    type: 'presence',
    subscribers: 9,
    messagesPerMin: 11,
  },
  { name: 'user:1:user:2', type: 'direct', subscribers: 2, messagesPerMin: 3 },
  { name: 'user:3:user:5', type: 'direct', subscribers: 2, messagesPerMin: 1 },
]

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant={connected ? 'default' : 'secondary'}
      className={
        connected
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }
    >
      {connected ? (
        <Wifi className="mr-1 h-3 w-3" />
      ) : (
        <WifiOff className="mr-1 h-3 w-3" />
      )}
      {connected ? 'Connected' : 'Disconnected'}
    </Badge>
  )
}

function ChannelRow({ channel }: { channel: Channel }) {
  const typeConfig = CHANNEL_TYPES.find((t) => t.type === channel.type)
  const TypeIcon = typeConfig?.icon || Hash

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-md p-1.5 ${typeConfig?.bg || ''}`}>
          <TypeIcon
            className={`h-4 w-4 ${typeConfig?.color || 'text-zinc-500'}`}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">
            {channel.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {typeConfig?.label || channel.type}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Users className="h-3 w-3" />
          {channel.subscribers}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Activity className="h-3 w-3" />
          {channel.messagesPerMin}/min
        </div>
        <Circle
          className={`h-2 w-2 ${
            channel.messagesPerMin > 0
              ? 'fill-emerald-500 text-emerald-500'
              : 'fill-zinc-300 text-zinc-300'
          }`}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function RealtimeContent() {
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [cliOutput, setCliOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<string>(
    'nself service realtime channels',
  )
  const [channelsOutput, setChannelsOutput] = useState<string | null>(null)
  const [eventsOutput, setEventsOutput] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'channels')

  // Test message form state
  const [testChannel, setTestChannel] = useState('general')
  const [testEvent, setTestEvent] = useState('message')
  const [testMessage, setTestMessage] = useState('Hello from nAdmin!')

  // Filter state
  const [channelFilter, setChannelFilter] = useState<string>('all')

  const filteredChannels =
    channelFilter === 'all'
      ? MOCK_CHANNELS
      : MOCK_CHANNELS.filter((c) => c.type === channelFilter)

  // Initialize real-time service
  const initRealtime = useCallback(async () => {
    setInitLoading(true)
    setError(null)
    setLastCommand('nself service realtime init')
    try {
      const res = await fetch('/api/services/realtime/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output)
        setConnected(true)
      } else {
        setError(json.error || 'Failed to initialize real-time service')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setInitLoading(false)
    }
  }, [])

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service realtime channels')
    try {
      const res = await fetch('/api/services/realtime/channels')
      const json = await res.json()
      if (json.success) {
        setChannelsOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to fetch channels')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service realtime events')
    try {
      const res = await fetch('/api/services/realtime/events')
      const json = await res.json()
      if (json.success) {
        setEventsOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to fetch events')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  // Send test message
  const sendTestMessage = useCallback(async () => {
    if (!testChannel.trim() || !testMessage.trim()) return
    setTestLoading(true)
    setError(null)
    setLastCommand(
      `nself service realtime test --channel=${testChannel} --event=${testEvent} --message="${testMessage}"`,
    )
    try {
      const res = await fetch('/api/services/realtime/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: testChannel,
          event: testEvent,
          message: testMessage,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Test message sent successfully')
      } else {
        setError(json.error || 'Failed to send test message')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setTestLoading(false)
    }
  }, [testChannel, testEvent, testMessage])

  const totalSubscribers = MOCK_CHANNELS.reduce(
    (sum, c) => sum + c.subscribers,
    0,
  )
  const totalMessagesPerMin = MOCK_CHANNELS.reduce(
    (sum, c) => sum + c.messagesPerMin,
    0,
  )

  return (
    <PageShell
      title="Real-Time Service"
      description="Manage WebSocket channels, monitor live events, and test real-time messaging"
      actions={
        <div className="flex items-center gap-2">
          <ConnectionBadge connected={connected} />
          <Button
            variant="outline"
            size="sm"
            onClick={initRealtime}
            disabled={initLoading}
          >
            {initLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Initialize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchChannels}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Channels
                </p>
                <p className="text-2xl font-bold">{MOCK_CHANNELS.length}</p>
              </div>
              <Radio className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Subscribers
                </p>
                <p className="text-2xl font-bold">{totalSubscribers}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Messages/min
                </p>
                <p className="text-2xl font-bold">{totalMessagesPerMin}</p>
              </div>
              <Zap className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Status
                </p>
                <p className="text-2xl font-bold">
                  {connected ? 'Active' : 'Idle'}
                </p>
              </div>
              {connected ? (
                <Wifi className="h-8 w-8 text-emerald-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-zinc-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-700">
        <nav className="flex space-x-8">
          {(
            [
              { key: 'channels', label: 'Channels' },
              { key: 'events', label: 'Live Events' },
              { key: 'presence', label: 'Presence' },
              { key: 'test', label: 'Test Message' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="mb-6 space-y-4">
          {/* Channel Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Filter:
            </span>
            {[
              { value: 'all', label: 'All' },
              ...CHANNEL_TYPES.map((t) => ({
                value: t.type,
                label: t.label,
              })),
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setChannelFilter(filter.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  channelFilter === filter.value
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Channel Type Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNEL_TYPES.map((ct) => {
              const count = MOCK_CHANNELS.filter(
                (c) => c.type === ct.type,
              ).length
              const Icon = ct.icon
              return (
                <Card key={ct.type}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${ct.bg}`}>
                        <Icon className={`h-5 w-5 ${ct.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {ct.label}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {count} channel{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {ct.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Channel List */}
          <div className="space-y-2">
            {filteredChannels.map((channel) => (
              <ChannelRow key={channel.name} channel={channel} />
            ))}
          </div>

          {/* CLI channels output */}
          {channelsOutput && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Channels from CLI</CardTitle>
                <CardDescription>
                  Output from nself service realtime channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <pre className="text-xs text-zinc-700 dark:text-zinc-300">
                    {channelsOutput}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Live Event Stream
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEvents}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Activity className="mr-2 h-4 w-4" />
              )}
              Fetch Events
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {eventsOutput ? (
                <ScrollArea className="h-64">
                  <pre className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {eventsOutput}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-zinc-500">
                  <Activity className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm">No events loaded yet.</p>
                  <p className="text-xs text-zinc-400">
                    Click &quot;Fetch Events&quot; to load the event stream.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Presence Tab */}
      {activeTab === 'presence' && (
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Presence Indicators
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {MOCK_CHANNELS.filter((c) => c.type === 'presence').map(
              (channel) => (
                <Card key={channel.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <CardTitle className="text-base">
                          {channel.name}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary">
                        {channel.subscribers} online
                      </Badge>
                    </div>
                    <CardDescription>
                      Presence channel with {channel.subscribers} active members
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        { length: Math.min(channel.subscribers, 8) },
                        (_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700"
                          >
                            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                            User {i + 1}
                          </div>
                        ),
                      )}
                      {channel.subscribers > 8 && (
                        <div className="flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                          +{channel.subscribers - 8} more
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>

          {MOCK_CHANNELS.filter((c) => c.type === 'presence').length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center text-zinc-500">
              <Users className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm">No presence channels found.</p>
            </div>
          )}
        </div>
      )}

      {/* Test Message Tab */}
      {activeTab === 'test' && (
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Send Test Message
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Channel
                  </label>
                  <input
                    type="text"
                    value={testChannel}
                    onChange={(e) => setTestChannel(e.target.value)}
                    placeholder="e.g. general, private-updates"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={testEvent}
                    onChange={(e) => setTestEvent(e.target.value)}
                    placeholder="e.g. message, update, notification"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter your test message..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <Button
                  onClick={sendTestMessage}
                  disabled={
                    testLoading || !testChannel.trim() || !testMessage.trim()
                  }
                  className="flex items-center gap-2"
                >
                  {testLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Test Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CLI Command Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">CLI Command</CardTitle>
          </div>
          <CardDescription>
            Command executed against the nself CLI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 p-4">
            <div className="mb-2 font-mono text-sm text-emerald-400">
              $ {lastCommand}
            </div>
            {cliOutput && (
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-xs text-zinc-300">
                  {cliOutput}
                </pre>
              </ScrollArea>
            )}
            {!cliOutput && (
              <p className="font-mono text-xs text-zinc-500">
                Run a command to see output here
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

export default function RealtimePage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <RealtimeContent />
    </Suspense>
  )
}
