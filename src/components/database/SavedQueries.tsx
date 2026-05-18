'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, Edit2, FolderOpen, Search, Star, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export interface SavedQuery {
  id: string
  name: string
  query: string
  database: string
  folder?: string
  createdAt: string
  updatedAt?: string
  starred: boolean
}

interface SavedQueriesProps {
  queries: SavedQuery[]
  onLoad: (query: SavedQuery) => void
  onSave: (query: Omit<SavedQuery, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, updates: Partial<SavedQuery>) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onExport: () => void
  onImport: (queries: SavedQuery[]) => void
}

export function SavedQueries({
  queries,
  onLoad,
  onUpdate,
  onDelete,
  onToggleStar,
  onExport,
  onImport,
}: SavedQueriesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null)
  const [editName, setEditName] = useState('')
  const [editFolder, setEditFolder] = useState('')

  const filteredQueries = queries.filter(
    (q) =>
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.query.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const starredQueries = filteredQueries.filter((q) => q.starred)
  const regularQueries = filteredQueries.filter((q) => !q.starred)

  // Group by folder
  const folders = new Map<string, SavedQuery[]>()
  regularQueries.forEach((q) => {
    const folder = q.folder || 'Uncategorized'
    if (!folders.has(folder)) {
      folders.set(folder, [])
    }
    folders.get(folder)?.push(q)
  })

  const handleEdit = (query: SavedQuery) => {
    setEditingQuery(query)
    setEditName(query.name)
    setEditFolder(query.folder || '')
  }

  const handleSaveEdit = () => {
    if (editingQuery) {
      onUpdate(editingQuery.id, {
        name: editName,
        folder: editFolder || undefined,
        updatedAt: new Date().toISOString(),
      })
      setEditingQuery(null)
      toast.success('Query updated')
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const queries = JSON.parse(event.target?.result as string)
        onImport(queries)
        toast.success(`Imported ${queries.length} queries`)
      } catch {
        toast.error('Invalid file format')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Saved Queries
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search saved queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {starredQueries.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    Favorites
                  </h3>
                  <div className="space-y-2">
                    {starredQueries.map((query) => (
                      <QueryCard
                        key={query.id}
                        query={query}
                        onLoad={onLoad}
                        onEdit={handleEdit}
                        onDelete={onDelete}
                        onToggleStar={onToggleStar}
                      />
                    ))}
                  </div>
                </div>
              )}

              {Array.from(folders.entries()).map(([folder, queries]) => (
                <div key={folder}>
                  <h3 className="mb-2 text-sm font-medium">{folder}</h3>
                  <div className="space-y-2">
                    {queries.map((query) => (
                      <QueryCard
                        key={query.id}
                        query={query}
                        onLoad={onLoad}
                        onEdit={handleEdit}
                        onDelete={onDelete}
                        onToggleStar={onToggleStar}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {filteredQueries.length === 0 && (
                <div className="py-8 text-center text-zinc-500">
                  {searchTerm ? 'No matching queries found' : 'No saved queries'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!editingQuery} onOpenChange={() => setEditingQuery(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Query</DialogTitle>
            <DialogDescription>Update query name and folder</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Query Name</Label>
              <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder">Folder (optional)</Label>
              <Input
                id="folder"
                value={editFolder}
                onChange={(e) => setEditFolder(e.target.value)}
                placeholder="e.g., Reports, Analytics"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuery(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function QueryCard({
  query,
  onLoad,
  onEdit,
  onDelete,
  onToggleStar,
}: {
  query: SavedQuery
  onLoad: (query: SavedQuery) => void
  onEdit: (query: SavedQuery) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
}) {
  return (
    <div className="group bg-card cursor-pointer rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1" onClick={() => onLoad(query)}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium">{query.name}</span>
            <Badge variant="outline" className="text-xs">
              {query.database}
            </Badge>
          </div>
          <div className="overflow-hidden rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-900">
            <div className="line-clamp-2">{query.query}</div>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>Created: {query.createdAt}</span>
            {query.updatedAt && <span>Updated: {query.updatedAt}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar(query.id)
            }}
          >
            <Star className={`h-4 w-4 ${query.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(query)
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(query.id)
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}
