'use client'

import { CodeEditorSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Clock,
  Database,
  Download,
  FolderOpen,
  History,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  Save,
  Settings,
  Star,
  Table,
  X,
  XCircle,
} from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'

interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
  error?: string
}

interface SavedQuery {
  id: string
  name: string
  query: string
  database: string
  createdAt: string
  starred: boolean
}

interface QueryHistory {
  id: string
  query: string
  database: string
  executionTime: number
  timestamp: string
  status: 'success' | 'error'
  rowCount?: number
  error?: string
}

interface QueryTab {
  id: string
  name: string
  query: string
  result?: QueryResult
  isExecuting: boolean
  database: string
}

function SQLConsoleContent() {
  const [activeTab, setActiveTab] = useState<string>('tab-1')
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      name: 'Query 1',
      query: '',
      isExecuting: false,
      database: 'main',
    },
  ])
  const [selectedDatabase, setSelectedDatabase] = useState('main')
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [databases, setDatabases] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Load databases from API
    fetch('/api/database/query', { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        if (!res.ok) return
        const data = await res.json()
        const dbs = data.data?.databases ?? data.data ?? []
        if (Array.isArray(dbs) && dbs.length > 0) {
          setDatabases(dbs)
          setSelectedDatabase(dbs[0])
          setTabs((prev) => prev.map((t, i) => (i === 0 ? { ...t, database: dbs[0] } : t)))
        }
        setIsConnected(true)
      })
      .catch(() => setIsConnected(false))

    // Load persisted history and saved queries from localStorage
    try {
      const h = localStorage.getItem('sql-console-history')
      if (h) setQueryHistory(JSON.parse(h).slice(0, 50))
    } catch {
      /* ignore */
    }

    try {
      const s = localStorage.getItem('sql-console-saved')
      if (s) setSavedQueries(JSON.parse(s))
    } catch {
      /* ignore */
    }
  }, [])

  // Persist history and saved queries
  useEffect(() => {
    if (queryHistory.length > 0) {
      localStorage.setItem('sql-console-history', JSON.stringify(queryHistory.slice(0, 50)))
    }
  }, [queryHistory])

  useEffect(() => {
    if (savedQueries.length > 0) {
      localStorage.setItem('sql-console-saved', JSON.stringify(savedQueries))
    }
  }, [savedQueries])

  const executeQuery = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab || !tab.query.trim()) return

    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isExecuting: true, result: undefined } : t))
    )

    const startTime = Date.now()

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: tab.query, database: tab.database }),
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      const data = await response.json()
      const executionTime = Date.now() - startTime

      if (!response.ok || !data.success) {
        const errorMessage = data.error ?? `HTTP ${response.status}`
        const errResult: QueryResult = {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime,
          error: errorMessage,
        }
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, isExecuting: false, result: errResult } : t))
        )
        const historyEntry: QueryHistory = {
          id: Date.now().toString(),
          query: tab.query,
          database: tab.database,
          executionTime,
          timestamp: new Date().toLocaleString(),
          status: 'error',
          error: errorMessage,
        }
        setQueryHistory((prev) => [historyEntry, ...prev])
        return
      }

      const queryResult: QueryResult = {
        columns: data.data?.columns ?? [],
        rows: data.data?.rows ?? [],
        rowCount: data.data?.rowCount ?? 0,
        executionTime,
      }

      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isExecuting: false, result: queryResult } : t))
      )

      const historyEntry: QueryHistory = {
        id: Date.now().toString(),
        query: tab.query,
        database: tab.database,
        executionTime,
        timestamp: new Date().toLocaleString(),
        status: 'success',
        rowCount: queryResult.rowCount,
      }
      setQueryHistory((prev) => [historyEntry, ...prev])
    } catch (err) {
      const executionTime = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed'
      const errResult: QueryResult = {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime,
        error: errorMessage,
      }
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isExecuting: false, result: errResult } : t))
      )
      const historyEntry: QueryHistory = {
        id: Date.now().toString(),
        query: tab.query,
        database: tab.database,
        executionTime,
        timestamp: new Date().toLocaleString(),
        status: 'error',
        error: errorMessage,
      }
      setQueryHistory((prev) => [historyEntry, ...prev])
    }
  }

  const addNewTab = () => {
    const newTabId = `tab-${Date.now()}`
    const newTab: QueryTab = {
      id: newTabId,
      name: `Query ${tabs.length + 1}`,
      query: '',
      isExecuting: false,
      database: selectedDatabase,
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTab(newTabId)
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return

    const tabIndex = tabs.findIndex((t) => t.id === tabId)
    setTabs((prev) => prev.filter((t) => t.id !== tabId))

    if (activeTab === tabId) {
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0
      setActiveTab(tabs[newActiveIndex]?.id || tabs[0]?.id)
    }
  }

  const updateTabQuery = (tabId: string, query: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, query } : t)))
  }

  const loadQueryFromHistory = (historyItem: QueryHistory) => {
    const activeTabData = tabs.find((t) => t.id === activeTab)
    if (activeTabData) {
      updateTabQuery(activeTab, historyItem.query)
    }
    setShowHistory(false)
  }

  const loadSavedQuery = (savedQuery: SavedQuery) => {
    const activeTabData = tabs.find((t) => t.id === activeTab)
    if (activeTabData) {
      updateTabQuery(activeTab, savedQuery.query)
    }
    setShowSaved(false)
  }

  const saveCurrentQuery = () => {
    const activeTabData = tabs.find((t) => t.id === activeTab)
    if (activeTabData && activeTabData.query.trim()) {
      const newSavedQuery: SavedQuery = {
        id: Date.now().toString(),
        name: `Query ${savedQueries.length + 1}`,
        query: activeTabData.query,
        database: activeTabData.database,
        createdAt: new Date().toISOString().split('T')[0],
        starred: false,
      }
      setSavedQueries((prev) => [newSavedQuery, ...prev])
    }
  }

  const exportResults = (format: 'csv' | 'json') => {
    const activeTabData = tabs.find((t) => t.id === activeTab)
    if (!activeTabData?.result) return

    const { columns, rows } = activeTabData.result
    let content: string
    let mimeType: string
    let filename: string

    if (format === 'csv') {
      const escape = (v: unknown) => {
        const s = v === null || v === undefined ? '' : String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }
      const header = columns.map(escape).join(',')
      const body = rows.map((row) => row.map(escape).join(',')).join('\n')
      content = `${header}\n${body}`
      mimeType = 'text/csv;charset=utf-8;'
      filename = 'query-results.csv'
    } else {
      const objects = rows.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])))
      content = JSON.stringify(objects, null, 2)
      mimeType = 'application/json'
      filename = 'query-results.json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const activeTabData = tabs.find((t) => t.id === activeTab)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">SQL Runner</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Execute SQL queries with multi-tab editor, query history, and results export. Destructive
          statements require confirmation.
        </p>
      </div>
      <div className="space-y-6">
        {/* Connection Status & Database Selector */}
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
                <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                  <History className="mr-2 h-4 w-4" />
                  History
                </Button>
                <Button variant="outline" onClick={() => setShowSaved(!showSaved)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Saved
                </Button>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Query Editor Tabs */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border">
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 border-r px-3 py-1.5 text-sm last:border-r-0',
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span>{tab.name}</span>
                      {tab.isExecuting && <Loader2 className="h-3 w-3 animate-spin" />}
                      {tabs.length > 1 && (
                        <X
                          className="h-3 w-3 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            closeTab(tab.id)
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" className="px-2" onClick={addNewTab}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={saveCurrentQuery}
                  disabled={!activeTabData?.query.trim()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Query
                </Button>
                <Button
                  onClick={() => executeQuery(activeTab)}
                  disabled={!activeTabData?.query.trim() || activeTabData?.isExecuting}
                >
                  {activeTabData?.isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* SQL Editor */}
            <div className="space-y-4">
              <Textarea
                ref={textareaRef}
                value={activeTabData?.query || ''}
                onChange={(e) => updateTabQuery(activeTab, e.target.value)}
                placeholder="Enter your SQL query here..."
                className="min-h-[200px] font-mono text-sm"
              />

              {/* Query Info */}
              {activeTabData?.query && (
                <div className="text-muted-foreground flex items-center gap-4 text-sm">
                  <span>Database: {activeTabData.database}</span>
                  <span>Characters: {activeTabData.query.length}</span>
                  <span>Lines: {activeTabData.query.split('\n').length}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Query Results */}
        {activeTabData?.result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-lg">Results</CardTitle>
                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {activeTabData.result.executionTime}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Table className="h-4 w-4" />
                      {activeTabData.result.rowCount} rows
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => exportResults('csv')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportResults('json')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-96">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        {activeTabData.result.columns.map((column, index) => (
                          <th
                            key={index}
                            className="border border-gray-200 px-4 py-2 text-left font-medium dark:border-gray-700"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTabData.result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="border border-gray-200 px-4 py-2 dark:border-gray-700"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Query History Sidebar */}
        {showHistory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Query History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {queryHistory.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer rounded border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => loadQueryFromHistory(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant="outline">{item.database}</Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">{item.timestamp}</div>
                      </div>
                      <div className="mt-1 truncate rounded bg-gray-100 p-2 font-mono text-sm dark:bg-gray-800">
                        {item.query}
                      </div>
                      <div className="text-muted-foreground mt-1 flex items-center gap-4 text-xs">
                        <span>{item.executionTime}ms</span>
                        {item.rowCount !== undefined && <span>{item.rowCount} rows</span>}
                        {item.error && <span className="text-red-500">{item.error}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Saved Queries Sidebar */}
        {showSaved && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Saved Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {savedQueries.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer rounded border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => loadSavedQuery(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.starred && (
                            <Star className="h-4 w-4 fill-current text-yellow-500" />
                          )}
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline">{item.database}</Badge>
                      </div>
                      <div className="mt-1 truncate rounded bg-gray-100 p-2 font-mono text-sm dark:bg-gray-800">
                        {item.query}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        Created: {item.createdAt}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Quick Actions & Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Button variant="outline" className="h-auto justify-start p-4">
                <div className="text-left">
                  <div className="font-medium">Schema Browser</div>
                  <div className="text-muted-foreground text-xs">Browse tables</div>
                </div>
              </Button>
              <Button variant="outline" className="h-auto justify-start p-4">
                <div className="text-left">
                  <div className="font-medium">Query Templates</div>
                  <div className="text-muted-foreground text-xs">Common queries</div>
                </div>
              </Button>
              <Button variant="outline" className="h-auto justify-start p-4">
                <div className="text-left">
                  <div className="font-medium">Format Query</div>
                  <div className="text-muted-foreground text-xs">Auto-format SQL</div>
                </div>
              </Button>
              <Button variant="outline" className="h-auto justify-start p-4">
                <div className="text-left">
                  <div className="font-medium">Explain Plan</div>
                  <div className="text-muted-foreground text-xs">Query optimization</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SQLConsolePage() {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <SQLConsoleContent />
    </Suspense>
  )
}
