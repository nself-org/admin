import React from 'react'

export interface ResponsiveTableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface ResponsiveTableProps<T> {
  data: T[]
  columns: ResponsiveTableColumn<T>[]
  mobileCard: React.ComponentType<{ data: T }>
  loading?: boolean
  emptyMessage?: string
  className?: string
  onSort?: (column: string) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

/**
 * Responsive table component that displays as a table on desktop
 * and as cards on mobile
 */
export function ResponsiveTable<T extends { id: string | number }>({
  data,
  columns,
  mobileCard: MobileCard,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  onSort,
  sortColumn,
  sortDirection = 'asc',
}: ResponsiveTableProps<T>) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-10 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-10 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop: Table */}
      <div className={`hidden overflow-hidden rounded-xl md:block ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 ${
                      column.className || ''
                    }`}
                  >
                    {column.sortable && onSort ? (
                      <button
                        onClick={() => onSort(column.key)}
                        className="group flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white"
                      >
                        {column.header}
                        {sortColumn === column.key && (
                          <span className="text-blue-500">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <MobileCard key={row.id} data={row} />
        ))}
      </div>
    </>
  )
}

/**
 * Horizontal scroll container for wide content
 */
export function ScrollContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

/**
 * Generic mobile data card component
 */
export function MobileDataCard({
  title,
  subtitle,
  data,
  actions,
  icon: Icon,
  status,
  className = '',
}: {
  title: string
  subtitle?: string
  data: Array<{ label: string; value: React.ReactNode }>
  actions?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  status?: {
    text: string
    color: 'green' | 'red' | 'yellow' | 'blue' | 'zinc'
  }
  className?: string
}) {
  const statusColors = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    zinc: 'bg-zinc-400',
  }

  const statusTextColors = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    blue: 'text-blue-600 dark:text-blue-400',
    zinc: 'text-zinc-500',
  }

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50 ${className}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-zinc-500" />}
          <div>
            <div className="font-medium text-zinc-900 dark:text-white">{title}</div>
            {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
          </div>
        </div>
        {status && (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColors[status.color]}`} />
            <span className={`text-sm ${statusTextColors[status.color]}`}>{status.text}</span>
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="text-xs text-zinc-500">{item.label}</div>
            <div className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-white">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
          {actions}
        </div>
      )}
    </div>
  )
}
