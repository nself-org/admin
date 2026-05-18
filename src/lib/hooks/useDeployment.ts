'use client'

import type {
  BlueGreenDeployment,
  CanaryDeployment,
  Deployment,
  EnvironmentConfig,
  EnvironmentDiff,
  EnvironmentInfo,
  FrontendApp,
  HistoryEntry,
  PreviewEnvironment,
  SyncOperation,
} from '@/types/deployment'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useEnvironments() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    environments: EnvironmentInfo[]
  }>('/api/environments', fetcher, { refreshInterval: 30000 })

  return {
    environments: data?.environments || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useEnvironment(name: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    environment: EnvironmentConfig
  }>(name ? `/api/environments/${name}` : null, fetcher)

  return {
    environment: data?.environment,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useEnvironmentDiff(env1: string, env2: string) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    diff: EnvironmentDiff[]
  }>(env1 && env2 ? `/api/environments/diff?env1=${env1}&env2=${env2}` : null, fetcher)

  return {
    diff: data?.diff || [],
    isLoading,
    isError: !!error,
  }
}

export function useDeployments() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    deployments: Deployment[]
  }>('/api/deploy/status', fetcher, { refreshInterval: 10000 })

  return {
    deployments: data?.deployments || [],
    latest: data?.deployments?.[0],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function usePreviewEnvironments() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    previews: PreviewEnvironment[]
  }>('/api/deploy/preview', fetcher, { refreshInterval: 30000 })

  return {
    previews: data?.previews || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useCanaryDeployment() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    canary: CanaryDeployment | null
  }>('/api/deploy/canary', fetcher, { refreshInterval: 5000 })

  return {
    canary: data?.canary,
    isActive: !!data?.canary && data.canary.status === 'in_progress',
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useBlueGreenDeployment() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    blueGreen: BlueGreenDeployment | null
  }>('/api/deploy/blue-green', fetcher, { refreshInterval: 5000 })

  return {
    blueGreen: data?.blueGreen,
    activeColor: data?.blueGreen?.activeColor,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useSyncOperations() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    operations: SyncOperation[]
  }>('/api/sync', fetcher, { refreshInterval: 10000 })

  return {
    operations: data?.operations || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useSyncHistory() {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    operations: SyncOperation[]
  }>('/api/sync/history', fetcher)

  return {
    history: data?.operations || [],
    isLoading,
    isError: !!error,
  }
}

export function useHistory(type?: string) {
  const url = type ? `/api/history?type=${type}` : '/api/history'
  const { data, error, isLoading } = useSWR<{
    success: boolean
    entries: HistoryEntry[]
  }>(url, fetcher, { refreshInterval: 30000 })

  return {
    entries: data?.entries || [],
    isLoading,
    isError: !!error,
  }
}

export function useFrontendApps() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    apps: FrontendApp[]
  }>('/api/frontend', fetcher, { refreshInterval: 30000 })

  return {
    apps: data?.apps || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useFrontendApp(name: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    app: FrontendApp
  }>(name ? `/api/frontend/${name}` : null, fetcher)

  return {
    app: data?.app,
    isLoading,
    isError: !!error,
    mutate,
  }
}
