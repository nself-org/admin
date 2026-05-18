'use client'

import { TableSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowRight,
  ChevronRight,
  Columns,
  Copy,
  Database,
  Download,
  ExternalLink,
  Hash,
  Key,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface Column {
  name: string
  type: string
  nullable: boolean
  default?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?: { table: string; column: string }
}

interface Index {
  name: string
  columns: string[]
  unique: boolean
  type: string
}

interface ForeignKey {
  name: string
  column: string
  referencesTable: string
  referencesColumn: string
  onDelete: string
  onUpdate: string
}

interface TableInfo {
  name: string
  schema: string
  rowCount: number
  columns: Column[]
  indexes: Index[]
  foreignKeys: ForeignKey[]
}

function DatabaseSchemaContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTableSheet, setShowTableSheet] = useState(false)

  const fetchSchema = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/database/schema', {
        cache: 'no-store',
      })
      if (!response.ok) {
        setTables([])
        return
      }
      const data = await response.json()
      // API returns { success, data: { tables: TableInfo[] } }
      const fetched = data.data?.tables ?? data.data ?? []
      setTables(Array.isArray(fetched) ? fetched : [])
    } catch {
      setTables([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchema()
  }, [fetchSchema])

  const exportDBML = async () => {
    setIsExporting(true)
    try {
      // Generate DBML format
      let dbml = '// Database Schema - DBML Format\n\n'

      tables.forEach((table) => {
        dbml += `Table ${table.schema}.${table.name} {\n`
        table.columns.forEach((col) => {
          let colDef = `  ${col.name} ${col.type}`
          const modifiers = []
          if (col.isPrimaryKey) modifiers.push('pk')
          if (!col.nullable) modifiers.push('not null')
          if (col.default) modifiers.push(`default: ${col.default}`)
          if (col.isForeignKey && col.references) {
            modifiers.push(`ref: > ${col.references.table}.${col.references.column}`)
          }
          if (modifiers.length > 0) {
            colDef += ` [${modifiers.join(', ')}]`
          }
          dbml += colDef + '\n'
        })
        dbml += '}\n\n'
      })

      // Create and download file
      const blob = new Blob([dbml], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'schema.dbml'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export DBML:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const copyColumnDef = (col: Column) => {
    let def = `${col.name} ${col.type}`
    if (!col.nullable) def += ' NOT NULL'
    if (col.default) def += ` DEFAULT ${col.default}`
    navigator.clipboard.writeText(def)
  }

  const filteredTables = tables.filter(
    (table) =>
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.columns.some((col) => col.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const totalRows = tables.reduce((acc, t) => acc + t.rowCount, 0)
  const totalColumns = tables.reduce((acc, t) => acc + t.columns.length, 0)
  const totalIndexes = tables.reduce((acc, t) => acc + t.indexes.length, 0)
  const totalForeignKeys = tables.reduce((acc, t) => acc + t.foreignKeys.length, 0)

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Database Schema</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            View and explore your database schema
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Database Schema</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          View and explore your database schema
        </p>
      </div>
      <div className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Schema Viewer</AlertTitle>
          <AlertDescription>
            Explore your database tables, columns, indexes, and relationships. Click on a table to
            view detailed information.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Tables</p>
                  <p className="mt-1 text-2xl font-bold">{tables.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Table2 className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Columns</p>
                  <p className="mt-1 text-2xl font-bold">{totalColumns}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Columns className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Indexes</p>
                  <p className="mt-1 text-2xl font-bold">{totalIndexes}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                  <Hash className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Total Rows</p>
                  <p className="mt-1 text-2xl font-bold">{formatNumber(totalRows)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10">
                  <Database className="h-6 w-6 text-sky-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Export */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search tables or columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchSchema} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportDBML} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export DBML
          </Button>
        </div>

        {/* Tables List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Database Tables
            </CardTitle>
            <CardDescription>
              {filteredTables.length} table
              {filteredTables.length !== 1 ? 's' : ''} found
              {searchQuery && ` matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-zinc-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Table
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      Columns
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      Indexes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      Foreign Keys
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      Rows
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-700">
                  {filteredTables.map((table) => (
                    <tr
                      key={table.name}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      onClick={() => {
                        setSelectedTable(table)
                        setShowTableSheet(true)
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <Table2 className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {table.name}
                            </p>
                            <p className="text-xs text-zinc-500">{table.schema}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="outline">{table.columns.length}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="outline">{table.indexes.length}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            table.foreignKeys.length > 0 ? 'bg-sky-500/10 text-sky-500' : ''
                          }
                        >
                          {table.foreignKeys.length}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatNumber(table.rowCount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Relationships Overview */}
        {totalForeignKeys > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Table Relationships
              </CardTitle>
              <CardDescription>Foreign key relationships between tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tables
                  .filter((t) => t.foreignKeys.length > 0)
                  .flatMap((table) =>
                    table.foreignKeys.map((fk) => (
                      <div
                        key={fk.name}
                        className="flex items-center gap-4 rounded-lg border p-3 dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{table.name}</Badge>
                          <span className="text-sm text-zinc-500">.{fk.column}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-400" />
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-sky-500/10 text-sky-500">
                            {fk.referencesTable}
                          </Badge>
                          <span className="text-sm text-zinc-500">.{fk.referencesColumn}</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
                          <span>ON DELETE: {fk.onDelete}</span>
                          <span>ON UPDATE: {fk.onUpdate}</span>
                        </div>
                      </div>
                    ))
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table Detail Sheet */}
        <Sheet open={showTableSheet} onOpenChange={setShowTableSheet}>
          <SheetContent className="w-full sm:max-w-2xl">
            {selectedTable && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Table2 className="h-5 w-5" />
                    {selectedTable.schema}.{selectedTable.name}
                  </SheetTitle>
                  <SheetDescription>
                    {formatNumber(selectedTable.rowCount)} rows - {selectedTable.columns.length}{' '}
                    columns
                  </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="columns" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="columns">Columns</TabsTrigger>
                    <TabsTrigger value="indexes">Indexes</TabsTrigger>
                    <TabsTrigger value="foreignKeys">Foreign Keys</TabsTrigger>
                  </TabsList>

                  <TabsContent value="columns" className="mt-4">
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      <div className="space-y-2">
                        {selectedTable.columns.map((col) => (
                          <div
                            key={col.name}
                            className="rounded-lg border p-3 dark:border-zinc-700"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {col.isPrimaryKey && <Key className="h-4 w-4 text-amber-500" />}
                                {col.isForeignKey && (
                                  <ExternalLink className="h-4 w-4 text-sky-500" />
                                )}
                                <span className="font-medium">{col.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyColumnDef(col)
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline">{col.type}</Badge>
                              {!col.nullable && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500">
                                  NOT NULL
                                </Badge>
                              )}
                              {col.default && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                                  DEFAULT: {col.default}
                                </Badge>
                              )}
                              {col.references && (
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-500">
                                  FK: {col.references.table}.{col.references.column}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="indexes" className="mt-4">
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      {selectedTable.indexes.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500">No indexes defined</div>
                      ) : (
                        <div className="space-y-2">
                          {selectedTable.indexes.map((idx) => (
                            <div
                              key={idx.name}
                              className="rounded-lg border p-3 dark:border-zinc-700"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{idx.name}</span>
                                <div className="flex items-center gap-2">
                                  {idx.unique && (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-500/10 text-emerald-500"
                                    >
                                      UNIQUE
                                    </Badge>
                                  )}
                                  <Badge variant="outline">{idx.type}</Badge>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {idx.columns.map((col) => (
                                  <Badge key={col} variant="secondary">
                                    {col}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="foreignKeys" className="mt-4">
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      {selectedTable.foreignKeys.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500">
                          No foreign keys defined
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedTable.foreignKeys.map((fk) => (
                            <div
                              key={fk.name}
                              className="rounded-lg border p-3 dark:border-zinc-700"
                            >
                              <p className="font-medium">{fk.name}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline">{fk.column}</Badge>
                                <ArrowRight className="h-4 w-4 text-zinc-400" />
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-500">
                                  {fk.referencesTable}.{fk.referencesColumn}
                                </Badge>
                              </div>
                              <div className="mt-2 text-xs text-zinc-500">
                                ON DELETE: {fk.onDelete} | ON UPDATE: {fk.onUpdate}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

export default function DatabaseSchemaPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DatabaseSchemaContent />
    </Suspense>
  )
}
