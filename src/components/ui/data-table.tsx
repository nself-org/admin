'use client'

import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { ArrowUpDown, Download } from 'lucide-react'
import * as React from 'react'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Input } from './input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

/**
 * Advanced data table component with sorting, filtering, pagination, and bulk actions
 *
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: 'Name' },
 *   { accessorKey: 'email', header: 'Email' },
 * ]
 *
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   searchKey="name"
 *   enableRowSelection
 *   bulkActions={[
 *     { label: 'Delete', onClick: (rows) => handleDelete(rows) },
 *   ]}
 * />
 * ```
 */

export interface DataTableProps<TData, TValue> {
  /** Table columns configuration */
  columns: ColumnDef<TData, TValue>[]
  /** Table data */
  data: TData[]
  /** Enable global search filter */
  searchKey?: string
  /** Search placeholder */
  searchPlaceholder?: string
  /** Enable row selection */
  enableRowSelection?: boolean
  /** Bulk actions for selected rows */
  bulkActions?: Array<{
    label: string
    onClick: (rows: TData[]) => void
    variant?: 'default' | 'destructive'
  }>
  /** Enable export functionality */
  enableExport?: boolean
  /** Page size options */
  pageSizeOptions?: number[]
  /** Default page size */
  defaultPageSize?: number
  /** Class name */
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  enableRowSelection = false,
  bulkActions = [],
  enableExport = false,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Add selection column if enabled
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }

    return [selectionColumn, ...columns]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: defaultPageSize,
      },
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)

  const exportToCSV = () => {
    const headers = columns.map((col) => {
      if ('header' in col && typeof col.header === 'string') {
        return col.header
      }
      return String(col.id || '')
    })

    const rows = data.map((row) =>
      columns.map((col) => {
        const accessor = 'accessorKey' in col ? col.accessorKey : undefined
        const value = accessor ? row[accessor as keyof TData] : ''
        return String(value || '')
      })
    )

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.json'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {searchKey && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
              className="w-full sm:max-w-sm"
            />
          )}

          {enableRowSelection && selectedRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {selectedRows.length} selected
              </span>
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {enableExport && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
                <Download className="h-4 w-4" />
                <span className="sm:inline">Export</span>
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="w-40 rounded-md border border-zinc-200 bg-white p-2 shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                sideOffset={4}
              >
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" onClick={exportToCSV} className="justify-start">
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportToJSON}
                    className="justify-start"
                  >
                    Export JSON
                  </Button>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {/* Table - Desktop View */}
      <div className="hidden overflow-x-auto rounded-md border border-zinc-200 sm:block dark:border-zinc-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Card View - Mobile */}
      <div className="space-y-3 sm:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header
                const headerText = typeof header === 'string' ? header : String(cell.column.id)

                if (cell.column.id === 'select') {
                  return (
                    <div key={cell.id} className="mb-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  )
                }

                return (
                  <div key={cell.id} className="mb-2 flex justify-between">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      {headerText}
                    </span>
                    <span className="text-sm text-zinc-900 dark:text-white">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                )
              })}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-zinc-200 p-12 text-center dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400">No results.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Rows per page</p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value))
            }}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {pageSizeOptions.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export helper for creating sortable column headers
export function SortableHeader({
  column,
  children,
}: {
  column: unknown
  children: React.ReactNode
}) {
  const col = column as {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc: boolean) => void
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => col.toggleSorting(col.getIsSorted() === 'asc')}
      className="-ml-3 h-8"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}
