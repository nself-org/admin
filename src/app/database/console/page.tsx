'use client'

import { QueryHistory, QueryHistoryItem } from '@/components/database/QueryHistory'
import { ResultsTable } from '@/components/database/ResultsTable'
import { SQLEditor } from '@/components/database/SQLEditor'
import { SavedQueries, SavedQuery } from '@/components/database/SavedQueries'
import { SchemaBrowser } from '@/components/database/SchemaBrowser'
import { CodeEditorSkeleton } from '@/components/skeletons/CodeEditorSkeleton'
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
import { ScrollContainer } from '@/components/ui/responsive-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Database,
  FileCode,
  FolderOpen,
  History,
  Loader2,
  Play,
  Save,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
  error?: string
}

const QUERY_TEMPLATES = [
  {
    name: 'Select All Users',
    query: 'SELECT * FROM users LIMIT 10;',
  },
  {
    name: 'Show Table Structure',
    query:
      "SELECT column_name, data_type, is_nullable\nFROM information_schema.columns\nWHERE table_name = 'users';",
  },
  {
    name: 'List All Tables',
    query: "SELECT table_name\nFROM information_schema.tables\nWHERE table_schema = 'public';",
  },
  {
    name: 'Count Rows',
    query: 'SELECT COUNT(*) FROM users;',
  },
  {
    name: 'Recent Records',
    query: 'SELECT * FROM users\nORDER BY created_at DESC\nLIMIT 20;',
  },
]

function DatabaseConsoleContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [selectedDatabase, setSelectedDatabase] = useState('main')
  const [query, setQuery] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [showSchema, setShowSchema] = useState(true)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveQueryName, setSaveQueryName] = useState('')
  const [saveQueryFolder, setSaveQueryFolder] = useState('')
  const [databases, setDatabases] = useState<string[]>([])
  const [schemaTables, setSchemaTables] = useState<any[]>([])

  // Load databases, schema and persisted local data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [dbRes, schemaRes] = await Promise.all([
          fetch('/api/database/query', { cache: 'no-store' }),
          fetch('/api/database/schema', { cache: 'no-store' }),
        ])

        if (dbRes.status === 401 || schemaRes.status === 401) {
          window.location.href = '/login'
          return
        }

        if (dbRes.ok) {
          const dbData = await dbRes.json()
          const dbs = dbData.data?.databases ?? dbData.data ?? []
          setDatabases(Array.isArray(dbs) ? dbs : [])
          if (Array.isArray(dbs) && dbs.length > 0) {
            setSelectedDatabase(dbs[0])
          }
        }

        if (schemaRes.ok) {
          const schemaData = await schemaRes.json()
          const tables = schemaData.data?.tables ?? schemaData.data ?? []
          setSchemaTables(Array.isArray(tables) ? tables : [])
        }

        setIsConnected(true)
      } catch (_err) {
        setIsConnected(false)
      } finally {
        setIsLoading(false)
      }

      setQuery(QUERY_TEMPLATES[0].query)
    }

    load()

    // Load persisted data from localStorage
    const savedHistory = localStorage.getItem('db-console-history')
    if (savedHistory) {
      try {
        setQueryHistory(JSON.parse(savedHistory).slice(0, 50))
      } catch {
        // ignore corrupt data
      }
    }

    const savedQueriesData = localStorage.getItem('db-console-saved')
    if (savedQueriesData) {
      try {
        setSavedQueries(JSON.parse(savedQueriesData))
      } catch {
        // ignore corrupt data
      }
    }
  }, [])

  // Save history to localStorage
  useEffect(() => {
    if (queryHistory.length > 0) {
      localStorage.setItem('db-console-history', JSON.stringify(queryHistory))
    }
  }, [queryHistory])

  // Save queries to localStorage
  useEffect(() => {
    if (savedQueries.length > 0) {
      localStorage.setItem('db-console-saved', JSON.stringify(savedQueries))
    }
  }, [savedQueries])

  const executeQuery = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Please enter a query')
      return
    }

    setIsExecuting(true)
    setError(null)
    setResult(null)

    const startTime = Date.now()

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: query, database: selectedDatabase }),
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMessage = data.error ?? `HTTP ${response.status}`
        setError(errorMessage)
        const historyItem: QueryHistoryItem = {
          id: Date.now().toString(),
          query,
          database: selectedDatabase,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toLocaleString(),
          status: 'error',
          error: errorMessage,
        }
        setQueryHistory((prev) => [historyItem, ...prev.slice(0, 49)])
        toast.error(errorMessage)
        return
      }

      const queryResult: QueryResult = {
        columns: data.data?.columns ?? [],
        rows: data.data?.rows ?? [],
        rowCount: data.data?.rowCount ?? 0,
        executionTime: Date.now() - startTime,
      }

      setResult(queryResult)

      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query,
        database: selectedDatabase,
        executionTime: queryResult.executionTime,
        timestamp: new Date().toLocaleString(),
        status: 'success',
        rowCount: queryResult.rowCount,
      }
      setQueryHistory((prev) => [historyItem, ...prev.slice(0, 49)])
      toast.success(`Query executed (${queryResult.executionTime}ms)`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed'
      setError(errorMessage)

      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query,
        database: selectedDatabase,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toLocaleString(),
        status: 'error',
        error: errorMessage,
      }
      setQueryHistory((prev) => [historyItem, ...prev.slice(0, 49)])
      toast.error(errorMessage)
    } finally {
      setIsExecuting(false)
    }
  }, [query, selectedDatabase])

  const handleSaveQuery = () => {
    if (!saveQueryName.trim()) {
      toast.error('Please enter a query name')
      return
    }

    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: saveQueryName,
      query,
      database: selectedDatabase,
      folder: saveQueryFolder || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      starred: false,
    }

    setSavedQueries((prev) => [newQuery, ...prev])
    setShowSaveDialog(false)
    setSaveQueryName('')
    setSaveQueryFolder('')
    toast.success('Query saved successfully')
  }

  const handleTableClick = (tableName: string) => {
    const template = `INSERT INTO ${tableName} (column1, column2, column3)\nVALUES (value1, value2, value3);`
    setQuery(template)
  }

  const handleColumnClick = (tableName: string, columnName: string) => {
    setQuery((prev) => {
      if (prev.trim() === '' || prev.includes('SELECT *')) {
        return `SELECT ${columnName} FROM ${tableName};`
      }
      // Add to existing SELECT
      if (prev.toLowerCase().includes('select')) {
        return prev.replace(/SELECT\s+/i, `SELECT ${columnName}, `)
      }
      return `SELECT ${columnName} FROM ${tableName};`
    })
  }

  const handleLoadFromHistory = (item: QueryHistoryItem) => {
    setQuery(item.query)
    setShowHistory(false)
  }

  const handleLoadSavedQuery = (savedQuery: SavedQuery) => {
    setQuery(savedQuery.query)
    setShowSaved(false)
  }

  const handleDeleteHistory = (id: string) => {
    setQueryHistory((prev) => prev.filter((item) => item.id !== id))
    toast.success('Query removed from history')
  }

  const handleToggleHistoryStar = (id: string) => {
    setQueryHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    )
  }

  const handleDeleteSavedQuery = (id: string) => {
    setSavedQueries((prev) => prev.filter((q) => q.id !== id))
    toast.success('Query deleted')
  }

  const handleToggleSavedStar = (id: string) => {
    setSavedQueries((prev) => prev.map((q) => (q.id === id ? { ...q, starred: !q.starred } : q)))
  }

  const handleUpdateSavedQuery = (id: string, updates: Partial<SavedQuery>) => {
    setSavedQueries((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const handleExportQueries = () => {
    const blob = new Blob([JSON.stringify(savedQueries, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saved-queries-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Queries exported')
  }

  const handleImportQueries = (queries: SavedQuery[]) => {
    setSavedQueries((prev) => [...queries, ...prev])
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Database Console</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Interactive PostgreSQL console
          </p>
        </div>
        <CodeEditorSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Database Console</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Interactive PostgreSQL console with SQL editor, schema browser, and query history.
          Destructive statements require confirmation.
        </p>
      </div>
      <div className="space-y-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <CardTitle className="text-lg">Database Connection</CardTitle>
                  <Badge variant={isConnected ? 'default' : 'destructive'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {databases.map((db) => (
                      <SelectItem key={db} value={db}>
                        {db}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showSchema ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowSchema(!showSchema)}
                >
                  <FileCode className="mr-2 h-4 w-4" />
                  Schema
                </Button>
                <Button
                  variant={showHistory ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="mr-2 h-4 w-4" />
                  History
                </Button>
                <Button
                  variant={showSaved ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowSaved(!showSaved)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Saved
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-12 gap-6">
          {/* Schema Browser */}
          {showSchema && (
            <div className="col-span-12 lg:col-span-3">
              <SchemaBrowser
                tables={schemaTables}
                onTableClick={handleTableClick}
                onColumnClick={handleColumnClick}
              />
            </div>
          )}

          {/* Main Editor */}
          <div className={showSchema ? 'col-span-12 lg:col-span-9' : 'col-span-12 lg:col-span-8'}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">SQL Editor</CardTitle>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const template = QUERY_TEMPLATES.find((t) => t.name === value)
                        if (template) setQuery(template.query)
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Query templates..." />
                      </SelectTrigger>
                      <SelectContent>
                        {QUERY_TEMPLATES.map((template) => (
                          <SelectItem key={template.name} value={template.name}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      disabled={!query.trim()}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Query
                    </Button>
                    <Button
                      size="sm"
                      onClick={executeQuery}
                      disabled={!query.trim() || isExecuting}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Execute (⌘⏎)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <SQLEditor
                  value={query}
                  onChange={(value) => setQuery(value || '')}
                  onExecute={executeQuery}
                  height="400px"
                />

                {query && (
                  <div className="mt-2 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <span>Database: {selectedDatabase}</span>
                    <span>Characters: {query.length}</span>
                    <span>Lines: {query.split('\n').length}</span>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-start gap-2">
                      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 dark:text-red-200">Query Error</h4>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {result && !error && (
              <ScrollContainer className="mt-6">
                <ResultsTable result={result} />
              </ScrollContainer>
            )}

            {/* Empty State */}
            {!result && !error && !isExecuting && query.trim() && (
              <div className="mt-6">
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-zinc-400" />
                      <h3 className="mt-4 text-lg font-medium">Ready to execute</h3>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Press the Execute button or use ⌘+Enter to run your query
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* History/Saved Sidebar */}
          {!showSchema && (showHistory || showSaved) && (
            <div className="col-span-12 lg:col-span-4">
              {showHistory && (
                <QueryHistory
                  history={queryHistory}
                  onLoad={handleLoadFromHistory}
                  onDelete={handleDeleteHistory}
                  onToggleStar={handleToggleHistoryStar}
                />
              )}
              {showSaved && (
                <div className={showHistory ? 'mt-6' : ''}>
                  <SavedQueries
                    queries={savedQueries}
                    onLoad={handleLoadSavedQuery}
                    onSave={(query) => {
                      const newQuery: SavedQuery = {
                        ...query,
                        id: Date.now().toString(),
                        createdAt: new Date().toISOString().split('T')[0],
                      }
                      setSavedQueries((prev) => [newQuery, ...prev])
                    }}
                    onUpdate={handleUpdateSavedQuery}
                    onDelete={handleDeleteSavedQuery}
                    onToggleStar={handleToggleSavedStar}
                    onExport={handleExportQueries}
                    onImport={handleImportQueries}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Query Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
            <DialogDescription>Save this query for quick access later</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="queryName">Query Name</Label>
              <Input
                id="queryName"
                placeholder="e.g., Active Users Report"
                value={saveQueryName}
                onChange={(e) => setSaveQueryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queryFolder">Folder (optional)</Label>
              <Input
                id="queryFolder"
                placeholder="e.g., Reports, Analytics"
                value={saveQueryFolder}
                onChange={(e) => setSaveQueryFolder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuery}>Save Query</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DatabaseConsolePage() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="sr-only">Database Console</h1>
          <CodeEditorSkeleton />
        </div>
      }
    >
      <DatabaseConsoleContent />
    </Suspense>
  )
}
