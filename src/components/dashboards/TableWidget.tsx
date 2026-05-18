'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Widget } from '@/types/dashboard'
import { ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

interface TableWidgetProps {
  widget: Widget
  className?: string
}

interface TableData {
  columns: Array<{
    key: string
    label: string
    type?: 'text' | 'number' | 'badge' | 'date'
    sortable?: boolean
  }>
  rows: Array<Record<string, unknown>>
}

// API fetcher with error handling
const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Failed to fetch')
  }
  const data = await res.json()
  if (data.success === false) {
    throw new Error(data.error || 'Operation failed')
  }
  // If response has success:true wrapper, unwrap it
  return data.success ? data.data : data
}

// Badge variant mapping for status values
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  running: 'default',
  success: 'default',
  warning: 'secondary',
  pending: 'secondary',
  error: 'destructive',
  failed: 'destructive',
  inactive: 'outline',
  stopped: 'outline',
}

export function TableWidget({ widget, className }: TableWidgetProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const dataSource = widget.config.dataSource

  // Validate data source configuration
  const hasValidDataSource = dataSource?.endpoint && dataSource.type === 'api'

  // Use SWR for data fetching with refresh interval support
  const {
    data: tableData,
    error,
    isLoading,
  } = useSWR<TableData>(hasValidDataSource ? dataSource.endpoint : null, fetcher, {
    refreshInterval: dataSource?.refreshInterval ? dataSource.refreshInterval * 1000 : 0,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!tableData?.rows || !sortColumn) return tableData?.rows || []

    return [...tableData.rows].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      // Handle different types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal || '')
      const bStr = String(bVal || '')
      const comparison = aStr.localeCompare(bStr)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [tableData?.rows, sortColumn, sortDirection])

  // Handle column header click for sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  // Format cell value based on column type
  const formatCellValue = (value: unknown, type: string | undefined): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-zinc-400">-</span>
    }

    switch (type) {
      case 'badge': {
        const strValue = String(value)
        return <Badge variant={statusVariants[strValue] || 'secondary'}>{strValue}</Badge>
      }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)
      case 'date':
        try {
          return new Date(String(value)).toLocaleDateString()
        } catch {
          return String(value)
        }
      default:
        return String(value)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('h-full overflow-auto p-4', className)}>
        <div className="space-y-3">
          <div className="h-8 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded bg-zinc-50 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center p-4', className)}>
        <div className="text-center">
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </p>
          {!hasValidDataSource && (
            <p className="mt-1 text-xs text-zinc-400">Invalid data source configuration</p>
          )}
        </div>
      </div>
    )
  }

  if (!tableData || !tableData.rows || tableData.rows.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center p-4', className)}>
        <div className="text-center">
          <p className="text-sm text-zinc-500">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full overflow-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {tableData.columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable &&
                    'cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900'
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable && (
                    <ArrowUpDown
                      className={cn(
                        'h-3.5 w-3.5',
                        sortColumn === column.key
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-400'
                      )}
                    />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, rowIndex) => (
            <TableRow key={row.id ? String(row.id) : rowIndex}>
              {tableData.columns.map((column) => (
                <TableCell key={column.key}>
                  {formatCellValue(row[column.key], column.type)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
