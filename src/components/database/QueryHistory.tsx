'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, History, Search, Star, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'

export interface QueryHistoryItem {
  id: string
  query: string
  database: string
  executionTime: number
  timestamp: string
  status: 'success' | 'error'
  rowCount?: number
  error?: string
  starred?: boolean
}

interface QueryHistoryProps {
  history: QueryHistoryItem[]
  onLoad: (item: QueryHistoryItem) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
}

export function QueryHistory({ history, onLoad, onDelete, onToggleStar }: QueryHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredHistory = history.filter((item) =>
    item.query.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const starredItems = filteredHistory.filter((item) => item.starred)
  const recentItems = filteredHistory.filter((item) => !item.starred)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Query History
          </CardTitle>
          <Badge variant="secondary">{history.length} queries</Badge>
        </div>
        <div className="relative mt-4">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {starredItems.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  Favorites
                </h3>
                <div className="space-y-2">
                  {starredItems.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      onLoad={onLoad}
                      onDelete={onDelete}
                      onToggleStar={onToggleStar}
                    />
                  ))}
                </div>
              </div>
            )}

            {recentItems.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Recent</h3>
                <div className="space-y-2">
                  {recentItems.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      onLoad={onLoad}
                      onDelete={onDelete}
                      onToggleStar={onToggleStar}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredHistory.length === 0 && (
              <div className="py-8 text-center text-zinc-500">
                {searchTerm ? 'No matching queries found' : 'No query history'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function HistoryItemCard({
  item,
  onLoad,
  onDelete,
  onToggleStar,
}: {
  item: QueryHistoryItem
  onLoad: (item: QueryHistoryItem) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
}) {
  return (
    <div className="group bg-card cursor-pointer rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1" onClick={() => onLoad(item)}>
          <div className="mb-1 flex items-center gap-2">
            {item.status === 'success' ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            )}
            <Badge variant="outline" className="text-xs">
              {item.database}
            </Badge>
            <span className="text-xs text-zinc-500">{item.timestamp}</span>
          </div>
          <div className="overflow-hidden rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-900">
            <div className="line-clamp-2">{item.query}</div>
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
            <span>{item.executionTime}ms</span>
            {item.rowCount !== undefined && <span>{item.rowCount} rows</span>}
            {item.error && <span className="truncate text-red-500">{item.error}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar(item.id)
            }}
          >
            <Star className={`h-4 w-4 ${item.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}
