'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, Copy, Download, Table } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
  error?: string
}

interface ResultsTableProps {
  result: QueryResult
}

export function ResultsTable({ result }: ResultsTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 100

  const totalPages = Math.ceil(result.rowCount / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const currentRows = result.rows.slice(startIndex, endIndex)

  const exportCSV = () => {
    const csvContent = [
      result.columns.join(','),
      ...result.rows.map((row) => row.map((cell) => JSON.stringify(cell)).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  const exportJSON = () => {
    const jsonData = result.rows.map((row) => {
      const obj: Record<string, any> = {}
      result.columns.forEach((col, idx) => {
        obj[col] = row[idx]
      })
      return obj
    })

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON exported successfully')
  }

  const copyToClipboard = () => {
    const text =
      viewMode === 'table'
        ? [result.columns.join('\t'), ...result.rows.map((row) => row.join('\t'))].join('\n')
        : JSON.stringify(
            result.rows.map((row) => {
              const obj: Record<string, any> = {}
              result.columns.forEach((col, idx) => {
                obj[col] = row[idx]
              })
              return obj
            }),
            null,
            2
          )

    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Query Results</CardTitle>
            <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {result.executionTime}ms
              </span>
              <span className="flex items-center gap-1">
                <Table className="h-4 w-4" />
                {result.rowCount.toLocaleString()} rows
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportJSON}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="json">JSON View</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-4">
            <ScrollArea className="h-[500px] rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      {result.columns.map((column, index) => (
                        <th
                          key={index}
                          className="border-b border-zinc-200 px-4 py-2 text-left text-sm font-medium dark:border-zinc-700"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border-b border-zinc-200 px-4 py-2 font-mono text-sm dark:border-zinc-700"
                          >
                            {cell === null
                              ? 'NULL'
                              : typeof cell === 'object'
                                ? JSON.stringify(cell)
                                : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, result.rowCount)} of{' '}
                  {result.rowCount} rows
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <ScrollArea className="h-[500px] rounded-md border">
              <pre className="p-4 text-sm">
                <code>
                  {JSON.stringify(
                    result.rows.map((row) => {
                      const obj: Record<string, any> = {}
                      result.columns.forEach((col, idx) => {
                        obj[col] = row[idx]
                      })
                      return obj
                    }),
                    null,
                    2
                  )}
                </code>
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
