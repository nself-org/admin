'use client'

import { PageTemplate } from '@/components/PageTemplate'
import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  CheckCircle,
  Database,
  FlaskConical,
  Loader2,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  Table2,
  Terminal,
  Trash2,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface TableConfig {
  name: string
  rowCount: number
  enabled: boolean
  columns: { name: string; type: string }[]
}

function DatabaseMockContent() {
  const [isDevelopment, setIsDevelopment] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [lastOutput, setLastOutput] = useState<string>('')
  const [tables, setTables] = useState<TableConfig[]>([])
  const [previewData, setPreviewData] = useState<Record<
    string,
    unknown[]
  > | null>(null)

  // Check if development mode
  useEffect(() => {
    setIsDevelopment(process.env.NODE_ENV !== 'production')
  }, [])

  // Fetch table schema
  const fetchSchema = useCallback(async () => {
    setIsLoading(true)
    try {
      // Mock schema data
      const mockTables: TableConfig[] = [
        {
          name: 'users',
          rowCount: 50,
          enabled: true,
          columns: [
            { name: 'id', type: 'uuid' },
            { name: 'email', type: 'varchar' },
            { name: 'name', type: 'varchar' },
            { name: 'avatar_url', type: 'text' },
            { name: 'role', type: 'varchar' },
          ],
        },
        {
          name: 'posts',
          rowCount: 100,
          enabled: true,
          columns: [
            { name: 'id', type: 'uuid' },
            { name: 'title', type: 'varchar' },
            { name: 'content', type: 'text' },
            { name: 'user_id', type: 'uuid' },
            { name: 'status', type: 'varchar' },
          ],
        },
        {
          name: 'comments',
          rowCount: 500,
          enabled: true,
          columns: [
            { name: 'id', type: 'uuid' },
            { name: 'content', type: 'text' },
            { name: 'post_id', type: 'uuid' },
            { name: 'user_id', type: 'uuid' },
          ],
        },
        {
          name: 'categories',
          rowCount: 10,
          enabled: false,
          columns: [
            { name: 'id', type: 'serial' },
            { name: 'name', type: 'varchar' },
            { name: 'slug', type: 'varchar' },
          ],
        },
      ]
      setTables(mockTables)
    } catch (error) {
      console.error('Failed to fetch schema:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchema()
  }, [fetchSchema])

  const updateTableConfig = (
    tableName: string,
    updates: Partial<TableConfig>,
  ) => {
    setTables((prev) =>
      prev.map((t) => (t.name === tableName ? { ...t, ...updates } : t)),
    )
  }

  const generatePreview = async () => {
    setIsGenerating(true)
    setProgress(0)
    setLastOutput('Generating preview...\n')

    try {
      // Simulate generation
      const enabledTables = tables.filter((t) => t.enabled)
      const preview: Record<string, unknown[]> = {}

      for (let i = 0; i < enabledTables.length; i++) {
        const table = enabledTables[i]
        setProgress(((i + 1) / enabledTables.length) * 100)
        setLastOutput((prev) => prev + `Generating ${table.name}...\n`)
        await new Promise((resolve) => setTimeout(resolve, 300))

        // Generate sample mock data
        const rows: unknown[] = []
        for (let j = 0; j < Math.min(5, table.rowCount); j++) {
          const row: Record<string, unknown> = {}
          table.columns.forEach((col) => {
            switch (col.type) {
              case 'uuid':
                row[col.name] =
                  `${Math.random().toString(36).substring(7)}-xxxx-xxxx`
                break
              case 'varchar':
                if (col.name.includes('email')) {
                  row[col.name] = `user${j + 1}@example.com`
                } else if (col.name.includes('name')) {
                  row[col.name] = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'][j]
                } else if (col.name.includes('title')) {
                  row[col.name] = `Sample Post Title ${j + 1}`
                } else if (col.name.includes('status')) {
                  row[col.name] = ['draft', 'published', 'archived'][j % 3]
                } else if (col.name.includes('role')) {
                  row[col.name] = ['user', 'admin'][j % 2]
                } else {
                  row[col.name] = `${col.name}_${j + 1}`
                }
                break
              case 'text':
                if (col.name.includes('content')) {
                  row[col.name] =
                    `Lorem ipsum dolor sit amet, consectetur adipiscing elit...`
                } else {
                  row[col.name] = `Sample text for ${col.name}`
                }
                break
              case 'serial':
                row[col.name] = j + 1
                break
              default:
                row[col.name] = `value_${j}`
            }
          })
          rows.push(row)
        }
        preview[table.name] = rows
      }

      setPreviewData(preview)
      setLastOutput(
        (prev) =>
          prev +
          `\nPreview generated successfully!\nTables: ${enabledTables.length}\nTotal sample rows: ${Object.values(preview).flat().length}`,
      )
    } catch (error) {
      setLastOutput(
        (prev) =>
          prev +
          `\nError: ${error instanceof Error ? error.message : 'Generation failed'}`,
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const generateMockData = async () => {
    if (
      !confirm('This will insert mock data into your database. Are you sure?')
    ) {
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setLastOutput('Starting mock data generation...\n')
    setPreviewData(null)

    try {
      const enabledTables = tables.filter((t) => t.enabled)
      const totalRows = enabledTables.reduce((acc, t) => acc + t.rowCount, 0)
      let processedRows = 0

      for (const table of enabledTables) {
        setLastOutput(
          (prev) =>
            prev + `\nGenerating ${table.rowCount} rows for ${table.name}...`,
        )
        await new Promise((resolve) => setTimeout(resolve, 500))
        processedRows += table.rowCount
        setProgress((processedRows / totalRows) * 100)
        setLastOutput((prev) => prev + ' Done!')
      }

      setLastOutput(
        (prev) =>
          prev +
          `\n\n--- Generation Complete ---\nTables: ${enabledTables.length}\nTotal rows: ${totalRows}\nTime: ${(Math.random() * 3 + 1).toFixed(2)}s`,
      )
    } catch (error) {
      setLastOutput(
        (prev) =>
          prev +
          `\nError: ${error instanceof Error ? error.message : 'Generation failed'}`,
      )
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isDevelopment) {
    return (
      <PageTemplate
        title="Mock Data Generator"
        description="Generate realistic mock data for your database"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Development Only</AlertTitle>
          <AlertDescription>
            The mock data generator is only available in development mode to
            prevent accidental data generation in production environments.
          </AlertDescription>
        </Alert>
      </PageTemplate>
    )
  }

  if (isLoading) {
    return (
      <PageTemplate
        title="Mock Data Generator"
        description="Generate realistic mock data for your database"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </PageTemplate>
    )
  }

  const enabledTables = tables.filter((t) => t.enabled)
  const totalRows = enabledTables.reduce((acc, t) => acc + t.rowCount, 0)

  return (
    <PageTemplate
      title="Mock Data Generator"
      description="Generate realistic mock data for your database"
    >
      <div className="space-y-6">
        {/* Development Warning */}
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertTitle>Development Tool</AlertTitle>
          <AlertDescription>
            This tool generates mock data using{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              nself db mock
            </code>
            . It is designed for development and testing purposes only.
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
                  <p className="text-sm font-medium text-zinc-500">Enabled</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-500">
                    {enabledTables.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Total Rows
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {totalRows.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                  <Database className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Progress</p>
                  <p className="mt-1 text-2xl font-bold">
                    {Math.round(progress)}%
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10">
                  <Sparkles className="h-6 w-6 text-sky-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Table Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <CardTitle>Table Configuration</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSchema}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <CardDescription>
                Configure row counts for each table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {tables.map((table) => (
                    <div
                      key={table.name}
                      className={`rounded-lg border p-4 transition-colors ${
                        table.enabled
                          ? 'border-zinc-200 dark:border-zinc-700'
                          : 'border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={table.enabled}
                            onChange={(e) =>
                              updateTableConfig(table.name, {
                                enabled: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          <div>
                            <p className="font-medium">{table.name}</p>
                            <p className="text-xs text-zinc-500">
                              {table.columns.length} columns
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`count-${table.name}`}
                            className="sr-only"
                          >
                            Row count
                          </Label>
                          <Input
                            id={`count-${table.name}`}
                            type="number"
                            min={1}
                            max={10000}
                            value={table.rowCount}
                            onChange={(e) =>
                              updateTableConfig(table.name, {
                                rowCount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-24"
                            disabled={!table.enabled}
                          />
                          <span className="text-sm text-zinc-500">rows</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions & Output */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Progress</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={generatePreview}
                  disabled={isGenerating || enabledTables.length === 0}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Preview
                </Button>
                <Button
                  onClick={generateMockData}
                  disabled={isGenerating || enabledTables.length === 0}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                disabled={isGenerating}
                onClick={() => {
                  if (confirm('Clear all mock data from enabled tables?')) {
                    setLastOutput(
                      'Clearing mock data...\nThis is a mock operation.',
                    )
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Mock Data
              </Button>

              {/* CLI Output */}
              <ScrollArea className="h-48 rounded-lg bg-zinc-950 p-4">
                {lastOutput ? (
                  <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                    {lastOutput}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-500">
                    Generate data to see output here
                  </div>
                )}
              </ScrollArea>

              {/* Command Preview */}
              <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Terminal className="h-4 w-4" />
                  <span>Command:</span>
                </div>
                <div className="mt-2">
                  $ nself db mock --tables=
                  {enabledTables.map((t) => t.name).join(',') || 'none'}{' '}
                  --count=
                  {totalRows}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Data */}
        {previewData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Data Preview
              </CardTitle>
              <CardDescription>
                Sample data that will be generated (first 5 rows per table)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(previewData).map(([tableName, rows]) => (
                  <div key={tableName}>
                    <h4 className="mb-2 flex items-center gap-2 font-medium">
                      <Table2 className="h-4 w-4 text-zinc-400" />
                      {tableName}
                      <Badge variant="outline">{rows.length} rows</Badge>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-zinc-700">
                            {Object.keys(rows[0] || {}).map((col) => (
                              <th
                                key={col}
                                className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-700">
                          {rows.map((row, i) => (
                            <tr
                              key={i}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            >
                              {Object.values(
                                row as Record<string, unknown>,
                              ).map((val, j) => (
                                <td
                                  key={j}
                                  className="max-w-xs truncate px-3 py-2 font-mono text-xs"
                                >
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  )
}

export default function DatabaseMockPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DatabaseMockContent />
    </Suspense>
  )
}
