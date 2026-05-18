'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { CloudServer } from '@/types/cloud'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  ExternalLink,
  Globe,
  HardDrive,
  MemoryStick,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Square,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const statusColors: Record<string, string> = {
  running: 'bg-emerald-900/30 text-emerald-400',
  stopped: 'bg-zinc-700 text-zinc-400',
  starting: 'bg-amber-900/30 text-amber-400',
  stopping: 'bg-amber-900/30 text-amber-400',
  provisioning: 'bg-blue-900/30 text-blue-400',
  error: 'bg-red-900/30 text-red-400',
  unknown: 'bg-zinc-700 text-zinc-500',
}

const statusIcons: Record<string, typeof CheckCircle> = {
  running: CheckCircle,
  stopped: Square,
  starting: Clock,
  stopping: Clock,
  provisioning: Clock,
  error: AlertCircle,
  unknown: AlertCircle,
}

function ServersContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<{ servers: CloudServer[] }>(
    '/api/cloud/servers',
    fetcher,
    { refreshInterval: 30000 },
  )

  const servers = data?.servers ?? []

  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.ip.includes(searchQuery) ||
      server.provider.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || server.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleServerAction = async (
    serverId: string,
    action: 'start' | 'stop' | 'restart' | 'delete',
  ) => {
    setActionLoading(serverId)
    try {
      await fetch(`/api/cloud/servers/${serverId}/${action}`, {
        method: 'POST',
      })
      await mutate()
    } catch (_error) {
      // Handle error
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkAction = async (action: 'start' | 'stop' | 'delete') => {
    for (const serverId of selectedServers) {
      await handleServerAction(serverId, action)
    }
    setSelectedServers([])
  }

  const toggleServerSelection = (serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId],
    )
  }

  const toggleSelectAll = () => {
    if (selectedServers.length === filteredServers.length) {
      setSelectedServers([])
    } else {
      setSelectedServers(filteredServers.map((s) => s.id))
    }
  }

  const runningCount = servers.filter((s) => s.status === 'running').length
  const stoppedCount = servers.filter((s) => s.status === 'stopped').length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cloud Servers</h1>
          <p className="text-sm text-zinc-400">Manage your cloud servers</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-emerald-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-emerald-400 dark:to-white">
          Cloud Servers
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {servers.length} servers ({runningCount} running, {stoppedCount}{' '}
          stopped)
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="provisioning">Provisioning</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedServers.length > 0 && (
            <>
              <span className="text-sm text-zinc-400">
                {selectedServers.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('start')}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-emerald-400 hover:bg-zinc-700"
              >
                <Play className="h-3 w-3" />
                Start
              </button>
              <button
                onClick={() => handleBulkAction('stop')}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-amber-400 hover:bg-zinc-700"
              >
                <Square className="h-3 w-3" />
                Stop
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="inline-flex items-center gap-1 rounded-lg border border-red-800 bg-red-900/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/40"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/cloud/servers/create"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Provision Server
          </Link>
        </div>
      </div>

      {/* Servers Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedServers.length === filteredServers.length &&
                    filteredServers.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Server
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Provider / Region
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Specs
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                IP Address
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {filteredServers.map((server) => {
              const StatusIcon = statusIcons[server.status] || AlertCircle
              return (
                <tr key={server.id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedServers.includes(server.id)}
                      onChange={() => toggleServerSelection(server.id)}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/cloud/servers/${server.name}`}
                      className="flex items-center gap-3 hover:text-emerald-400"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
                        <Server className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {server.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {server.size}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white capitalize">
                        {server.provider}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Globe className="h-3 w-3" />
                      {server.region}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {server.specs && (
                      <div className="space-y-1 text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          {server.specs.vcpu} vCPU
                        </div>
                        <div className="flex items-center gap-1">
                          <MemoryStick className="h-3 w-3" />
                          {server.specs.memory}
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {server.specs.storage}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusColors[server.status]
                      }`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {server.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {server.ip ? (
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-zinc-700/50 px-2 py-0.5 font-mono text-sm text-zinc-300">
                          {server.ip}
                        </code>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(server.ip)
                          }
                          className="text-zinc-500 hover:text-zinc-300"
                          title="Copy IP"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {server.status === 'running' ? (
                        <>
                          <button
                            onClick={() =>
                              handleServerAction(server.id, 'restart')
                            }
                            disabled={actionLoading === server.id}
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                            title="Restart"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleServerAction(server.id, 'stop')
                            }
                            disabled={actionLoading === server.id}
                            className="rounded p-1.5 text-amber-400 hover:bg-zinc-700 disabled:opacity-50"
                            title="Stop"
                          >
                            <Square className="h-4 w-4" />
                          </button>
                        </>
                      ) : server.status === 'stopped' ? (
                        <button
                          onClick={() => handleServerAction(server.id, 'start')}
                          disabled={actionLoading === server.id}
                          className="rounded p-1.5 text-emerald-400 hover:bg-zinc-700 disabled:opacity-50"
                          title="Start"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleServerAction(server.id, 'delete')}
                        disabled={actionLoading === server.id}
                        className="rounded p-1.5 text-red-400 hover:bg-zinc-700 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/cloud/servers/${server.name}`}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        title="Details"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredServers.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Server className="mb-4 h-12 w-12 text-zinc-500" />
            <p className="text-lg text-zinc-400">No servers found</p>
            <p className="text-sm text-zinc-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Provision your first server to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/cloud/servers/create"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Provision Server
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ServersPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <ServersContent />
    </Suspense>
  )
}
