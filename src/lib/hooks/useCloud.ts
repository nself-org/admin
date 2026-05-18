'use client'

import type {
  CloudProvider,
  CloudServer,
  CostComparison,
  CostEstimate,
  ServerMetrics,
  ServerSize,
} from '@/types/cloud'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useCloudProviders() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    providers: CloudProvider[]
  }>('/api/cloud/providers', fetcher, { refreshInterval: 60000 })

  return {
    providers: data?.providers || [],
    configured: data?.providers?.filter((p) => p.configured) || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useCloudProvider(name: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    provider: CloudProvider
  }>(name ? `/api/cloud/providers/${name}` : null, fetcher)

  return {
    provider: data?.provider,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useCloudServers() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    servers: CloudServer[]
  }>('/api/cloud/servers', fetcher, { refreshInterval: 30000 })

  return {
    servers: data?.servers || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useCloudServer(name: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    server: CloudServer
    metrics?: ServerMetrics
  }>(name ? `/api/cloud/servers/${name}` : null, fetcher, {
    refreshInterval: 10000,
  })

  return {
    server: data?.server,
    metrics: data?.metrics,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useCostEstimate(provider: string, size: ServerSize) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    estimate: CostEstimate
  }>(
    provider && size ? `/api/cloud/cost/estimate?provider=${provider}&size=${size}` : null,
    fetcher
  )

  return {
    estimate: data?.estimate,
    isLoading,
    isError: !!error,
  }
}

export function useCostComparison(size: ServerSize) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    comparison: CostComparison
  }>(size ? `/api/cloud/cost/compare?size=${size}` : null, fetcher)

  return {
    comparison: data?.comparison,
    isLoading,
    isError: !!error,
  }
}
