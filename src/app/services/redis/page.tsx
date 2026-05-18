'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Copy,
  Database,
  Download,
  Edit,
  Eye,
  Globe,
  Grid,
  HardDrive,
  Hash,
  Info,
  Key,
  List,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  Terminal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import React, { Suspense, useState } from 'react'
import useSWR from 'swr'

interface RedisKey {
  name: string
  type: 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream'
  ttl: number
  size: number
  encoding: string
  lastAccess: string
}

interface RedisStats {
  status: 'healthy' | 'unhealthy' | 'stopped'
  memory: {
    used: string
    peak: string
    percentage: number
    evictedKeys: number
  }
  performance: {
    connectedClients: number
    opsPerSecond: number
    hitRate: number
    missRate: number
    totalCommands: number
  }
  persistence: {
    lastSave: string
    changesSinceSave: number
    aofEnabled: boolean
  }
  databases: {
    [key: string]: {
      keys: number
      expires: number
    }
  }
}

interface SlowQuery {
  id: number
  timestamp: string
  duration: number
  command: string
  args: string[]
  client: string
}

interface PubSubChannel {
  name: string
  subscribers: number
  messages: number
  lastMessage: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const typeIcons = {
  string: Key,
  hash: Hash,
  list: List,
  set: Grid,
  zset: BarChart3,
  stream: Activity,
}

const typeColors = {
  string: 'text-blue-500',
  hash: 'text-green-500',
  list: 'text-sky-500',
  set: 'text-orange-500',
  zset: 'text-red-500',
  stream: 'text-teal-500',
}

function MemoryChart({ stats }: { stats: RedisStats }) {
  const memoryPercent = stats.memory.percentage

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Memory Usage</h3>
          <HardDrive className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="mb-2 text-2xl font-bold">{stats.memory.used}</div>
        <div className="mb-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={`h-2 rounded-full ${memoryPercent > 90 ? 'bg-red-500' : memoryPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(memoryPercent, 100)}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500">{memoryPercent.toFixed(1)}% used</div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Hit Rate</h3>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="mb-2 text-2xl font-bold">{stats.performance.hitRate.toFixed(1)}%</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="text-red-600">miss rate: {stats.performance.missRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Connections</h3>
          <Users className="h-4 w-4 text-blue-500" />
        </div>
        <div className="mb-2 text-2xl font-bold">{stats.performance.connectedClients}</div>
        <div className="text-xs text-zinc-500">Active connections</div>
      </div>
    </div>
  )
}

function KeyBrowser({
  keys,
  onKeySelect,
}: {
  keys: RedisKey[]
  onKeySelect: (key: RedisKey) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'ttl'>('name')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const filteredKeys = keys
    .filter((key) => {
      const matchesSearch = key.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || key.type === typeFilter
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'ttl':
          return (b.ttl || 0) - (a.ttl || 0)
        default:
          return 0
      }
    })

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Key Browser</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Add Key
            </Button>
            <Button variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="all">All Types</option>
            <option value="string">String</option>
            <option value="hash">Hash</option>
            <option value="list">List</option>
            <option value="set">Set</option>
            <option value="zset">Sorted Set</option>
            <option value="stream">Stream</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="ttl">Sort by TTL</option>
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-700">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-zinc-600' : ''}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-white shadow-sm dark:bg-zinc-600' : ''}`}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 text-sm text-zinc-500">{filteredKeys.length} keys found</div>

        {viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredKeys.map((key) => {
              const Icon = typeIcons[key.type]
              const colorClass = typeColors[key.type]

              return (
                <div
                  key={key.name}
                  onClick={() => onKeySelect(key)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-3 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <div>
                      <div className="text-sm font-medium">{key.name}</div>
                      <div className="text-xs text-zinc-500">
                        {key.type} • {key.encoding}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="text-right">
                      <div>{(key.size / 1024).toFixed(1)} KB</div>
                      <div>{key.ttl > 0 ? `${key.ttl}s TTL` : 'No TTL'}</div>
                    </div>
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredKeys.map((key) => {
              const Icon = typeIcons[key.type]
              const colorClass = typeColors[key.type]

              return (
                <div
                  key={key.name}
                  onClick={() => onKeySelect(key)}
                  className="cursor-pointer rounded-lg border border-zinc-200 p-3 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700">
                      {key.type}
                    </span>
                  </div>
                  <div className="mb-1 truncate text-sm font-medium">{key.name}</div>
                  <div className="text-xs text-zinc-500">
                    {(key.size / 1024).toFixed(1)} KB • {key.ttl > 0 ? `${key.ttl}s TTL` : 'No TTL'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KeyDetails({ redisKey, onClose }: { redisKey: RedisKey; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [ttl, setTtl] = useState(redisKey.ttl)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {React.createElement(typeIcons[redisKey.type], {
                className: `w-5 h-5 ${typeColors[redisKey.type]}`,
              })}
              <h3 className="text-lg font-semibold">{redisKey.name}</h3>
            </div>
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700">
              {redisKey.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditing(!editing)} className="text-xs">
              <Edit className="mr-1 h-3 w-3" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Button variant="outline" className="text-xs">
              <Copy className="mr-1 h-3 w-3" />
              Copy
            </Button>
            <Button variant="outline" className="text-xs">
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Size</label>
            <div className="text-lg font-semibold">{(redisKey.size / 1024).toFixed(1)} KB</div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Encoding</label>
            <div className="text-lg font-semibold">{redisKey.encoding}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">TTL</label>
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(parseInt(e.target.value))}
                  className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700"
                />
              ) : (
                <div className="text-lg font-semibold">{ttl > 0 ? `${ttl}s` : 'No TTL'}</div>
              )}
              {editing && (
                <Button variant="outline" className="text-xs">
                  <Save className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Value
          </label>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-64 w-full rounded-lg border border-zinc-200 p-3 font-mono text-sm dark:border-zinc-700"
              />
              <div className="flex gap-2">
                <Button className="text-xs">
                  <Save className="mr-1 h-3 w-3" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 font-mono text-sm dark:bg-zinc-900">
              {value}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function SlowQueryLog({ queries }: { queries: SlowQuery[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Slow Query Log</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-xs">
              <Download className="mr-1 h-3 w-3" />
              Export
            </Button>
            <Button variant="outline" className="text-xs">
              <Trash2 className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {queries.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">No slow queries detected</div>
        ) : (
          <div className="space-y-3">
            {queries.map((query) => (
              <div
                key={query.id}
                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Query #{query.id}</span>
                    <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                      {query.duration}ms
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{query.timestamp}</span>
                </div>

                <div className="mb-2 rounded bg-zinc-50 p-2 font-mono text-sm dark:bg-zinc-900">
                  {query.command} {query.args.join(' ')}
                </div>

                <div className="text-xs text-zinc-500">Client: {query.client}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PubSubMonitor({ channels }: { channels: PubSubChannel[] }) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [newChannel, setNewChannel] = useState('')
  const [message, setMessage] = useState('')

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pub/Sub Monitor</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Channel name..."
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              className="rounded border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
            />
            <Button className="text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Subscribe
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-medium">Active Channels</h4>
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.name}
                onClick={() => setSelectedChannel(channel.name)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  selectedChannel === channel.name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{channel.name}</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-zinc-400" />
                    <span className="text-xs text-zinc-500">{channel.subscribers}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {channel.messages} messages • Last: {channel.lastMessage}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-medium">Publish Message</h4>
          <div className="space-y-3">
            <select
              value={selectedChannel || ''}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <option value="">Select channel...</option>
              {channels.map((channel) => (
                <option key={channel.name} value={channel.name}>
                  {channel.name}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Message content..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-32 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            />

            <Button disabled={!selectedChannel || !message} className="w-full">
              <PlayCircle className="mr-2 h-4 w-4" />
              Publish Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfigurationEditor() {
  const [config, setConfig] = useState({
    maxmemory: '2gb',
    'maxmemory-policy': 'allkeys-lru',
    timeout: '300',
    'tcp-keepalive': '60',
    databases: '16',
    save: '900 1 300 10 60 10000',
    'stop-writes-on-bgsave-error': 'yes',
    rdbcompression: 'yes',
    rdbchecksum: 'yes',
  })

  const [modified, setModified] = useState(false)

  const handleConfigChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setModified(true)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Configuration Editor</h3>
          <div className="flex items-center gap-2">
            {modified && (
              <span className="text-xs text-orange-600 dark:text-orange-400">Unsaved changes</span>
            )}
            <Button variant="outline" className="text-xs">
              <RefreshCw className="mr-1 h-3 w-3" />
              Reload
            </Button>
            <Button className="text-xs" disabled={!modified}>
              <Save className="mr-1 h-3 w-3" />
              Save Config
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {Object.entries(config).map(([key, value]) => (
            <div key={key} className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{key}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className="rounded border border-zinc-200 px-3 py-2 font-mono text-sm md:col-span-2 dark:border-zinc-700"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Warning</p>
              <p className="mt-1 text-yellow-700 dark:text-yellow-300">
                Configuration changes require a Redis restart to take effect. Some settings may
                impact performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RedisContent() {
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'overview')
  const [selectedKey, setSelectedKey] = useState<RedisKey | null>(null)

  const { data: redisData, error: redisError } = useSWR<{
    success: boolean
    data: RedisStats
  }>('/api/services/redis', fetcher)

  const stats: RedisStats | null = redisData?.data ?? null

  const keys: RedisKey[] = []
  const slowQueries: SlowQuery[] = []
  const pubsubChannels: PubSubChannel[] = []

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'keys', label: 'Key Browser', icon: Database },
    { id: 'pubsub', label: 'Pub/Sub', icon: Globe },
    { id: 'slowlog', label: 'Slow Queries', icon: Clock },
    { id: 'config', label: 'Configuration', icon: Settings },
  ]

  if (redisError) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">
                {redisError instanceof Error ? redisError.message : 'Failed to load Redis stats'}
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <Server className="h-8 w-8 text-red-500" />
                Redis Service
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Cache management, key browser, and performance monitoring
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Terminal className="mr-2 h-4 w-4" />
                Redis CLI
              </Button>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          {stats && <MemoryChart stats={stats} />}

          {/* Quick Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Evicted Keys</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.memory.evictedKeys ?? '—'}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Ops/sec</p>
                  <p className="text-2xl font-bold">{stats?.performance.opsPerSecond ?? '—'}</p>
                </div>
                <Activity className="h-6 w-6 text-green-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Commands</p>
                  <p className="text-2xl font-bold">
                    {stats?.performance.totalCommands?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <Key className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Status</p>
                  <p className="text-lg font-bold capitalize">{stats?.status ?? '—'}</p>
                </div>
                <Info className="h-6 w-6 text-zinc-500" />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold">Database Distribution</h3>
                </div>
                <div className="p-4">
                  {!stats?.databases || Object.keys(stats.databases).length === 0 ? (
                    <div className="py-4 text-center text-sm text-zinc-500">
                      No database information available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const totalKeys = Object.values(stats.databases).reduce(
                          (sum, db) => sum + db.keys,
                          0
                        )
                        const safeDenom = totalKeys || 1
                        return Object.entries(stats.databases).map(([db, dbInfo]) => (
                          <div key={db} className="flex items-center justify-between">
                            <span className="text-sm">Database {db}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-32 rounded-full bg-zinc-200 dark:bg-zinc-700">
                                <div
                                  className="h-2 rounded-full bg-blue-500"
                                  style={{
                                    width: `${(dbInfo.keys / safeDenom) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="w-16 text-right text-sm font-medium">
                                {dbInfo.keys.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold">Key Type Distribution</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {Object.entries(typeColors).map(([type, colorClass]) => {
                      const count = keys.filter((k) => k.type === type).length
                      const percentage = keys.length > 0 ? (count / keys.length) * 100 : 0

                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {React.createElement(typeIcons[type as keyof typeof typeIcons], {
                              className: `w-4 h-4 ${colorClass}`,
                            })}
                            <span className="text-sm capitalize">{type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700">
                              <div
                                className={`h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="space-y-6">
            {selectedKey ? (
              <KeyDetails redisKey={selectedKey} onClose={() => setSelectedKey(null)} />
            ) : (
              <KeyBrowser keys={keys} onKeySelect={setSelectedKey} />
            )}
          </div>
        )}

        {activeTab === 'pubsub' && <PubSubMonitor channels={pubsubChannels} />}

        {activeTab === 'slowlog' && <SlowQueryLog queries={slowQueries} />}

        {activeTab === 'config' && <ConfigurationEditor />}
      </div>
    </>
  )
}

export default function RedisPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <RedisContent />
    </Suspense>
  )
}
