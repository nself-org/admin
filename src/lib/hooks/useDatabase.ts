'use client'

import type {
  Backup,
  BackupSchedule,
  DatabaseInspection,
  DatabaseStatus,
  Migration,
  Seed,
  SlowQuery,
  TableInfo,
} from '@/types/database'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useDatabaseStatus() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    status: DatabaseStatus
  }>('/api/database/status', fetcher, { refreshInterval: 10000 })

  return {
    status: data?.status,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useBackups() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    backups: Backup[]
  }>('/api/database/backup', fetcher, { refreshInterval: 30000 })

  return {
    backups: data?.backups || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useBackupSchedule() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    schedule: BackupSchedule
  }>('/api/database/backup/schedule', fetcher)

  return {
    schedule: data?.schedule,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useMigrations() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    migrations: Migration[]
  }>('/api/database/migrations', fetcher, { refreshInterval: 30000 })

  return {
    migrations: data?.migrations || [],
    pendingCount: data?.migrations?.filter((m) => m.status === 'pending').length || 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useSeeds() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    seeds: Seed[]
  }>('/api/database/seeds', fetcher)

  return {
    seeds: data?.seeds || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useTables() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    tables: TableInfo[]
  }>('/api/database/schema', fetcher, { refreshInterval: 60000 })

  return {
    tables: data?.tables || [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useTableDetail(tableName: string) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    table: TableInfo
  }>(tableName ? `/api/database/schema/${tableName}` : null, fetcher)

  return {
    table: data?.table,
    isLoading,
    isError: !!error,
  }
}

export function useDatabaseInspection() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    inspection: DatabaseInspection
  }>('/api/database/inspect', fetcher, { refreshInterval: 60000 })

  return {
    inspection: data?.inspection,
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useSlowQueries(limit = 20) {
  const { data, error, isLoading } = useSWR<{
    success: boolean
    queries: SlowQuery[]
  }>(`/api/database/inspect/slow?limit=${limit}`, fetcher, {
    refreshInterval: 30000,
  })

  return {
    queries: data?.queries || [],
    isLoading,
    isError: !!error,
  }
}
