'use client'

import type { Plugin, PluginSyncStatus, WebhookEvent } from '@/types/plugins'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function usePlugins() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    plugins: Plugin[]
  }>('/api/plugins', fetcher, { refreshInterval: 30000 })

  return {
    plugins: data?.plugins || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function usePlugin(name: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    plugin: Plugin
  }>(name ? `/api/plugins/${name}` : null, fetcher, { refreshInterval: 10000 })

  return {
    plugin: data?.plugin,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function usePluginSync(name: string) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    status: PluginSyncStatus
  }>(name ? `/api/plugins/${name}/sync` : null, fetcher, {
    refreshInterval: 5000,
  })

  return {
    syncStatus: data?.status,
    isLoading,
    isError: !!error,
  }
}

export function usePluginWebhooks(name: string, limit = 20) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    events: WebhookEvent[]
  }>(name ? `/api/plugins/${name}/webhooks?limit=${limit}` : null, fetcher, {
    refreshInterval: 10000,
  })

  return {
    events: data?.events || [],
    isLoading,
    isError: !!error,
  }
}

export function useMarketplace() {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    plugins: Plugin[]
  }>('/api/plugins/marketplace', fetcher, { refreshInterval: 60000 })

  return {
    plugins: data?.plugins || [],
    isLoading,
    isError: !!error,
  }
}

export function usePluginUpdates() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    updates: Plugin[]
  }>(
    '/api/plugins/updates',
    fetcher,
    { refreshInterval: 300000 } // 5 minutes
  )

  return {
    updates: data?.updates || [],
    hasUpdates: (data?.updates?.length || 0) > 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}
