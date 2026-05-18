'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, Database, Search, Table } from 'lucide-react'
import { useState } from 'react'

interface TableInfo {
  name: string
  schema: string
  rowCount?: number
  columns: ColumnInfo[]
}

interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey?: boolean
  isForeignKey?: boolean
}

interface SchemaBrowserProps {
  tables: TableInfo[]
  onTableClick: (tableName: string) => void
  onColumnClick: (tableName: string, columnName: string) => void
}

export function SchemaBrowser({ tables, onTableClick, onColumnClick }: SchemaBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedTables(newExpanded)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Schema Browser
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-1">
            {filteredTables.map((table) => {
              const isExpanded = expandedTables.has(table.name)
              return (
                <div key={table.name} className="rounded-md border">
                  <div
                    className="flex cursor-pointer items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    onClick={() => toggleTable(table.name)}
                  >
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <Table className="h-4 w-4 text-blue-500" />
                    <span className="flex-1 text-sm font-medium">{table.name}</span>
                    {table.rowCount !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {table.rowCount.toLocaleString()}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTableClick(table.name)
                      }}
                      className="h-6 text-xs"
                    >
                      INSERT
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-zinc-50 dark:bg-zinc-900">
                      <div className="space-y-1 p-2">
                        {table.columns.map((column) => (
                          <div
                            key={column.name}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => onColumnClick(table.name, column.name)}
                          >
                            <div className="flex h-4 w-4 items-center justify-center">
                              {column.isPrimaryKey && (
                                <span className="text-xs font-bold text-yellow-500">K</span>
                              )}
                            </div>
                            <span className="flex-1 font-mono">{column.name}</span>
                            <Badge variant="outline" className="text-xs font-normal">
                              {column.type}
                            </Badge>
                            {column.nullable && <span className="text-xs text-zinc-500">NULL</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredTables.length === 0 && (
              <div className="py-8 text-center text-zinc-500">
                {searchTerm ? 'No matching tables found' : 'No tables found'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
