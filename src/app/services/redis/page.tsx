'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
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
import React, { Suspense, useEffect, useState } from 'react'

interface RedisKey {
  name: string
  type: 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream'
  ttl: number
  size: number
  encoding: string
  lastAccess: string
}

interface RedisStats {
  version: string
  uptime: number
  connectedClients: number
  usedMemory: number
  maxMemory: number
  keyspaceHits: number
  keyspaceMisses: number
  evictedKeys: number
  expiredKeys: number
  totalKeys: number
  databases: { [key: string]: number }
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
  const memoryPercent = (stats.usedMemory / stats.maxMemory) * 100
  const hitRate =
    (stats.keyspaceHits / (stats.keyspaceHits + stats.keyspaceMisses)) * 100

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Memory Usage
          </h3>
          <HardDrive className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="mb-2 text-2xl font-bold">
          {(stats.usedMemory / (1024 * 1024 * 1024)).toFixed(1)} GB
        </div>
        <div className="mb-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={`h-2 rounded-full ${memoryPercent > 90 ? 'bg-red-500' : memoryPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${memoryPercent}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500">
          {memoryPercent.toFixed(1)}% of{' '}
          {(stats.maxMemory / (1024 * 1024 * 1024)).toFixed(1)} GB
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Hit Rate
          </h3>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="mb-2 text-2xl font-bold">{hitRate.toFixed(1)}%</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="text-green-600">
            {stats.keyspaceHits.toLocaleString()} hits
          </span>
          <span>/</span>
          <span className="text-red-600">
            {stats.keyspaceMisses.toLocaleString()} misses
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Connections
          </h3>
          <Users className="h-4 w-4 text-blue-500" />
        </div>
        <div className="mb-2 text-2xl font-bold">{stats.connectedClients}</div>
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
      const matchesSearch = key.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
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
        <div className="mb-3 text-sm text-zinc-500">
          {filteredKeys.length} keys found
        </div>

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
                  <div className="mb-1 truncate text-sm font-medium">
                    {key.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {(key.size / 1024).toFixed(1)} KB •{' '}
                    {key.ttl > 0 ? `${key.ttl}s TTL` : 'No TTL'}
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

function KeyDetails({
  redisKey,
  onClose,
}: {
  redisKey: RedisKey
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [ttl, setTtl] = useState(redisKey.ttl)

  useEffect(() => {
    const mockValues = {
      string: 'Hello, World!',
      hash: JSON.stringify(
        { field1: 'value1', field2: 'value2', field3: 'value3' },
        null,
        2,
      ),
      list: JSON.stringify(['item1', 'item2', 'item3'], null, 2),
      set: JSON.stringify(['member1', 'member2', 'member3'], null, 2),
      zset: JSON.stringify(
        [
          { member: 'item1', score: 1 },
          { member: 'item2', score: 2 },
        ],
        null,
        2,
      ),
      stream: JSON.stringify(
        [{ id: '1-0', fields: { field1: 'value1' } }],
        null,
        2,
      ),
    }

    setValue(mockValues[redisKey.type])
  }, [redisKey])

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
            <Button
              variant="outline"
              onClick={() => setEditing(!editing)}
              className="text-xs"
            >
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
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Size
            </label>
            <div className="text-lg font-semibold">
              {(redisKey.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Encoding
            </label>
            <div className="text-lg font-semibold">{redisKey.encoding}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              TTL
            </label>
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(parseInt(e.target.value))}
                  className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700"
                />
              ) : (
                <div className="text-lg font-semibold">
                  {ttl > 0 ? `${ttl}s` : 'No TTL'}
                </div>
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
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="text-xs"
                >
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
          <div className="py-8 text-center text-zinc-500">
            No slow queries detected
          </div>
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
                    <span className="text-sm font-medium">
                      Query #{query.id}
                    </span>
                    <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                      {query.duration}ms
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {query.timestamp}
                  </span>
                </div>

                <div className="mb-2 rounded bg-zinc-50 p-2 font-mono text-sm dark:bg-zinc-900">
                  {query.command} {query.args.join(' ')}
                </div>

                <div className="text-xs text-zinc-500">
                  Client: {query.client}
                </div>
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
                    <span className="text-xs text-zinc-500">
                      {channel.subscribers}
                    </span>
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
              <span className="text-xs text-orange-600 dark:text-orange-400">
                Unsaved changes
              </span>
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
            <div
              key={key}
              className="grid grid-cols-1 items-center gap-4 md:grid-cols-3"
            >
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {key}
              </label>
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
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Warning
              </p>
              <p className="mt-1 text-yellow-700 dark:text-yellow-300">
                Configuration changes require a Redis restart to take effect.
                Some settings may impact performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RedisContent() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedKey, setSelectedKey] = useState<RedisKey | null>(null)
  const [_loading, _setLoading] = useState(false)

  // Mock data
  const [stats] = useState<RedisStats>({
    version: 'Redis 7.0.11',
    uptime: 86400 * 7,
    connectedClients: 12,
    usedMemory: 1024 * 1024 * 1024 * 1.5, // 1.5GB
    maxMemory: 1024 * 1024 * 1024 * 2, // 2GB
    keyspaceHits: 150234,
    keyspaceMisses: 5021,
    evictedKeys: 12,
    expiredKeys: 456,
    totalKeys: 8432,
    databases: { '0': 8432, '1': 234, '2': 56 },
  })

  const [keys] = useState<RedisKey[]>([
    {
      name: 'user:session:abc123',
      type: 'string',
      ttl: 3600,
      size: 1024,
      encoding: 'embstr',
      lastAccess: '2024-01-17 10:30:00',
    },
    {
      name: 'user:profile:123',
      type: 'hash',
      ttl: -1,
      size: 2048,
      encoding: 'hashtable',
      lastAccess: '2024-01-17 10:29:45',
    },
    {
      name: 'notifications:queue',
      type: 'list',
      ttl: 7200,
      size: 4096,
      encoding: 'linkedlist',
      lastAccess: '2024-01-17 10:29:30',
    },
    {
      name: 'active:users',
      type: 'set',
      ttl: -1,
      size: 8192,
      encoding: 'hashtable',
      lastAccess: '2024-01-17 10:29:15',
    },
    {
      name: 'leaderboard:scores',
      type: 'zset',
      ttl: 86400,
      size: 3072,
      encoding: 'skiplist',
      lastAccess: '2024-01-17 10:29:00',
    },
    {
      name: 'events:stream:analytics',
      type: 'stream',
      ttl: -1,
      size: 16384,
      encoding: 'stream',
      lastAccess: '2024-01-17 10:28:45',
    },
  ])

  const [slowQueries] = useState<SlowQuery[]>([
    {
      id: 1,
      timestamp: '2024-01-17 10:25:30',
      duration: 1250,
      command: 'KEYS',
      args: ['user:*'],
      client: '127.0.0.1:45123',
    },
    {
      id: 2,
      timestamp: '2024-01-17 10:20:15',
      duration: 890,
      command: 'ZRANGE',
      args: ['leaderboard:scores', '0', '-1', 'WITHSCORES'],
      client: '127.0.0.1:45124',
    },
  ])

  const [pubsubChannels] = useState<PubSubChannel[]>([
    {
      name: 'notifications',
      subscribers: 5,
      messages: 1234,
      lastMessage: '2 min ago',
    },
    {
      name: 'chat:room:general',
      subscribers: 12,
      messages: 5678,
      lastMessage: '30s ago',
    },
    {
      name: 'analytics:events',
      subscribers: 3,
      messages: 890,
      lastMessage: '5 min ago',
    },
  ])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'keys', label: 'Key Browser', icon: Database },
    { id: 'pubsub', label: 'Pub/Sub', icon: Globe },
    { id: 'slowlog', label: 'Slow Queries', icon: Clock },
    { id: 'config', label: 'Configuration', icon: Settings },
  ]

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
          <MemoryChart stats={stats} />

          {/* Quick Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total Keys
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.totalKeys.toLocaleString()}
                  </p>
                </div>
                <Key className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Expired
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.expiredKeys}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Evicted
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.evictedKeys}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Version
                  </p>
                  <p className="text-lg font-bold">
                    {stats.version.split(' ')[1]}
                  </p>
                </div>
                <Info className="h-6 w-6 text-zinc-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Uptime
                  </p>
                  <p className="text-lg font-bold">
                    {Math.floor(stats.uptime / 86400)}d
                  </p>
                </div>
                <Activity className="h-6 w-6 text-green-500" />
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
                  <h3 className="text-lg font-semibold">
                    Database Distribution
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {Object.entries(stats.databases).map(([db, count]) => (
                      <div
                        key={db}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">Database {db}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 rounded-full bg-zinc-200 dark:bg-zinc-700">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{
                                width: `${(count / stats.totalKeys) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-16 text-right text-sm font-medium">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold">
                    Key Type Distribution
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {Object.entries(typeColors).map(([type, colorClass]) => {
                      const count = keys.filter((k) => k.type === type).length
                      const percentage = (count / keys.length) * 100

                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {React.createElement(
                              typeIcons[type as keyof typeof typeIcons],
                              {
                                className: `w-4 h-4 ${colorClass}`,
                              },
                            )}
                            <span className="text-sm capitalize">{type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700">
                              <div
                                className={`h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-sm font-medium">
                              {count}
                            </span>
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
              <KeyDetails
                redisKey={selectedKey}
                onClose={() => setSelectedKey(null)}
              />
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
