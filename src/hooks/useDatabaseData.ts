import { useProjectStore } from '@/stores/projectStore'

export function useDatabaseData() {
  // ONLY subscribe to store data - NO fetching!
  // BackgroundDataService handles all data fetching
  const databaseStats = useProjectStore((state) => state.databaseStats)
  const databaseTables = useProjectStore((state) => state.databaseTables)
  const projectStatus = useProjectStore((state) => state.projectStatus)

  // Track if we have data
  const hasStats = !!databaseStats
  const hasTables = Array.isArray(databaseTables) && databaseTables.length > 0
  const hasData = hasStats || hasTables

  // Loading state based on project status and data availability
  const _isLoading = projectStatus === 'running' && !hasData
  const isInitializing = projectStatus === 'running' && !hasData
  const error = null // No error state needed since we're just reading from store

  // Manual refresh - just a placeholder since BackgroundDataService handles updates
  const refresh = () => {}

  // Execute a custom query
  const executeQuery = async (query: string) => {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Query execution failed')
    }

    return data.data
  }

  // Get table data with pagination
  const getTableData = async (
    tableName: string,
    schema: string = 'public',
    limit: number = 100,
    offset: number = 0
  ) => {
    const response = await fetch(
      `/api/database?action=table-data&table=${tableName}&schema=${schema}&limit=${limit}&offset=${offset}`
    )

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch table data')
    }

    return data.data
  }

  return {
    // Data
    stats: databaseStats,
    tables: databaseTables || [],

    // State
    isLoading: isInitializing && !hasData,
    isInitializing,
    error,
    hasData,

    // Actions
    refresh,
    executeQuery,
    getTableData,

    // Computed values
    totalTables: databaseStats?.tables || 0,
    totalViews: databaseStats?.views || 0,
    databaseSize: databaseStats?.size || '0 B',
    connections: databaseStats?.connections || 0,
    uptime: databaseStats?.uptime || 'Unknown',
    version: databaseStats?.version || 'Unknown',
  }
}
