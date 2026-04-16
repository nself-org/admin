'use client'

import { PageTemplate } from '@/components/PageTemplate'
import { TableSkeleton } from '@/components/skeletons'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Search,
  Shield,
  Terminal,
  Upload,
  X,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

type ExportFormat = 'csv' | 'json'

interface TableInfo {
  name: string
  rowCount: number
  columns: string[]
}

interface PIIField {
  table: string
  column: string
  type: 'email' | 'name' | 'phone' | 'address' | 'ssn' | 'ip' | 'custom'
  sampleValue: string
  selected: boolean
}

interface ImportPreview {
  fileName: string
  format: ExportFormat
  rowCount: number
  columns: string[]
  sampleRows: Record<string, string>[]
}

// Sample data for demonstration
const SAMPLE_TABLES: TableInfo[] = [
  {
    name: 'users',
    rowCount: 1250,
    columns: [
      'id',
      'email',
      'name',
      'password_hash',
      'avatar_url',
      'role',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'posts',
    rowCount: 3420,
    columns: [
      'id',
      'title',
      'content',
      'user_id',
      'status',
      'published_at',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'comments',
    rowCount: 8750,
    columns: ['id', 'content', 'post_id', 'user_id', 'created_at'],
  },
  {
    name: 'sessions',
    rowCount: 450,
    columns: [
      'id',
      'user_id',
      'token',
      'ip_address',
      'user_agent',
      'expires_at',
      'created_at',
    ],
  },
  {
    name: 'audit_logs',
    rowCount: 15200,
    columns: [
      'id',
      'user_id',
      'action',
      'entity_type',
      'entity_id',
      'ip_address',
      'created_at',
    ],
  },
]

const SAMPLE_PII_FIELDS: PIIField[] = [
  {
    table: 'users',
    column: 'email',
    type: 'email',
    sampleValue: 'john.doe@example.com',
    selected: true,
  },
  {
    table: 'users',
    column: 'name',
    type: 'name',
    sampleValue: 'John Doe',
    selected: true,
  },
  {
    table: 'sessions',
    column: 'ip_address',
    type: 'ip',
    sampleValue: '192.168.1.100',
    selected: true,
  },
  {
    table: 'sessions',
    column: 'user_agent',
    type: 'custom',
    sampleValue: 'Mozilla/5.0 (Macintosh...)',
    selected: false,
  },
  {
    table: 'audit_logs',
    column: 'ip_address',
    type: 'ip',
    sampleValue: '10.0.0.50',
    selected: true,
  },
]

function DatabaseDataContent() {
  const [activeTab, setActiveTab] = useState('export')

  // Export state
  const [selectedExportTable, setSelectedExportTable] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [exportLimit, setExportLimit] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportOutput, setExportOutput] = useState<string>('')

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [selectedImportTable, setSelectedImportTable] = useState<string>('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importOutput, setImportOutput] = useState<string>('')
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false)

  // Anonymize state
  const [piiFields, setPiiFields] = useState<PIIField[]>(SAMPLE_PII_FIELDS)
  const [isScanning, setIsScanning] = useState(false)
  const [isAnonymizing, setIsAnonymizing] = useState(false)
  const [anonymizeOutput, setAnonymizeOutput] = useState<string>('')
  const [anonymizeProgress, setAnonymizeProgress] = useState(0)

  const handleExport = async () => {
    if (!selectedExportTable) return

    setIsExporting(true)
    setExportOutput('')

    try {
      // Simulate CLI call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const table = SAMPLE_TABLES.find((t) => t.name === selectedExportTable)
      const rowCount = exportLimit
        ? Math.min(parseInt(exportLimit), table?.rowCount || 0)
        : table?.rowCount || 0

      setExportOutput(
        `Exporting ${selectedExportTable} to ${exportFormat.toUpperCase()}...\n\n` +
          `Rows exported: ${rowCount.toLocaleString()}\n` +
          `File size: ${(rowCount * 0.5).toFixed(1)} KB\n` +
          `Output: ./exports/${selectedExportTable}_${new Date().toISOString().split('T')[0]}.${exportFormat}\n\n` +
          `Export completed successfully!`,
      )

      // Simulate download
      const blob = new Blob(['Sample export data'], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedExportTable}.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportOutput(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setImportFile(file)

        // Simulate parsing preview
        const format = file.name.endsWith('.json') ? 'json' : 'csv'
        setImportPreview({
          fileName: file.name,
          format,
          rowCount: 150,
          columns: ['id', 'name', 'email', 'created_at'],
          sampleRows: [
            {
              id: '1',
              name: 'Alice Smith',
              email: 'alice@example.com',
              created_at: '2024-01-15',
            },
            {
              id: '2',
              name: 'Bob Johnson',
              email: 'bob@example.com',
              created_at: '2024-01-16',
            },
            {
              id: '3',
              name: 'Carol White',
              email: 'carol@example.com',
              created_at: '2024-01-17',
            },
          ],
        })
      }
    },
    [],
  )

  const handleImport = async () => {
    if (!importFile || !selectedImportTable) return

    setIsImporting(true)
    setImportOutput('')

    try {
      // Simulate CLI call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setImportOutput(
        `Importing ${importFile.name} into ${selectedImportTable}...\n\n` +
          `Rows parsed: ${importPreview?.rowCount || 0}\n` +
          `Rows inserted: ${importPreview?.rowCount || 0}\n` +
          `Rows skipped: 0\n` +
          `Errors: 0\n\n` +
          `Import completed successfully!`,
      )

      setImportFile(null)
      setImportPreview(null)
      setSelectedImportTable('')
    } catch (error) {
      setImportOutput(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleScanPII = async () => {
    setIsScanning(true)
    setAnonymizeOutput('Scanning database for PII fields...\n')

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setAnonymizeOutput(
        `Scanning database for PII fields...\n\n` +
          `Tables scanned: ${SAMPLE_TABLES.length}\n` +
          `Columns analyzed: ${SAMPLE_TABLES.reduce((acc, t) => acc + t.columns.length, 0)}\n` +
          `PII fields detected: ${SAMPLE_PII_FIELDS.length}\n\n` +
          `Scan completed. Review detected fields below.`,
      )

      setPiiFields(SAMPLE_PII_FIELDS)
    } catch (error) {
      setAnonymizeOutput(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  const handleAnonymize = async () => {
    const selectedFields = piiFields.filter((f) => f.selected)
    if (selectedFields.length === 0) return

    setIsAnonymizing(true)
    setAnonymizeProgress(0)
    setAnonymizeOutput('Starting anonymization...\n')

    try {
      for (let i = 0; i < selectedFields.length; i++) {
        const field = selectedFields[i]
        await new Promise((resolve) => setTimeout(resolve, 800))
        setAnonymizeProgress(((i + 1) / selectedFields.length) * 100)
        setAnonymizeOutput(
          (prev) =>
            prev + `Anonymizing ${field.table}.${field.column}... done\n`,
        )
      }

      setAnonymizeOutput(
        (prev) =>
          prev +
          `\nAnonymization completed!\n` +
          `Fields processed: ${selectedFields.length}\n` +
          `Records updated: ${selectedFields.length * 500} (estimated)`,
      )
    } catch (error) {
      setAnonymizeOutput(
        (prev) =>
          prev +
          `\nError: ${error instanceof Error ? error.message : 'Anonymization failed'}`,
      )
    } finally {
      setIsAnonymizing(false)
      setAnonymizeProgress(0)
    }
  }

  const togglePIIField = (index: number) => {
    setPiiFields((prev) =>
      prev.map((field, i) =>
        i === index ? { ...field, selected: !field.selected } : field,
      ),
    )
  }

  const getPIITypeBadge = (type: PIIField['type']) => {
    const colors: Record<PIIField['type'], string> = {
      email: 'bg-blue-500/10 text-blue-500',
      name: 'bg-sky-500/10 text-sky-500',
      phone: 'bg-green-500/10 text-green-500',
      address: 'bg-orange-500/10 text-orange-500',
      ssn: 'bg-red-500/10 text-red-500',
      ip: 'bg-cyan-500/10 text-cyan-500',
      custom: 'bg-zinc-500/10 text-zinc-500',
    }
    return colors[type]
  }

  return (
    <PageTemplate
      title="Data Operations"
      description="Export, import, and anonymize database data"
    >
      <div className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>nself CLI Integration</AlertTitle>
          <AlertDescription>
            This page executes{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              nself db export
            </code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              nself db import
            </code>
            , and{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              nself db anonymize
            </code>{' '}
            for data operations.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="anonymize" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Anonymize
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-emerald-600" />
                    Export Data
                  </CardTitle>
                  <CardDescription>
                    Export table data to CSV or JSON format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Table Selection */}
                  <div className="space-y-2">
                    <Label>Select Table</Label>
                    <Select
                      value={selectedExportTable}
                      onValueChange={setSelectedExportTable}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLE_TABLES.map((table) => (
                          <SelectItem key={table.name} value={table.name}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{table.name}</span>
                              <span className="text-xs text-zinc-500">
                                {table.rowCount.toLocaleString()} rows
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setExportFormat('csv')}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
                          exportFormat === 'csv'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        <FileSpreadsheet className="h-5 w-5" />
                        <span className="font-medium">CSV</span>
                      </button>
                      <button
                        onClick={() => setExportFormat('json')}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
                          exportFormat === 'json'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        <FileJson className="h-5 w-5" />
                        <span className="font-medium">JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Row Limit */}
                  <div className="space-y-2">
                    <Label>Row Limit (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Leave empty for all rows"
                      value={exportLimit}
                      onChange={(e) => setExportLimit(e.target.value)}
                    />
                  </div>

                  {/* Export Button */}
                  <Button
                    onClick={handleExport}
                    disabled={!selectedExportTable || isExporting}
                    className="w-full"
                    size="lg"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                      </>
                    )}
                  </Button>

                  {/* Command Preview */}
                  <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Terminal className="h-4 w-4" />
                      <span>Command:</span>
                    </div>
                    <div className="mt-2">
                      $ nself db export
                      {selectedExportTable
                        ? ` --table=${selectedExportTable}`
                        : ''}{' '}
                      --format={exportFormat}
                      {exportLimit && ` --limit=${exportLimit}`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CLI Output */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    CLI Output
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80 rounded-lg bg-zinc-950 p-4">
                    {exportOutput ? (
                      <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                        {exportOutput}
                      </pre>
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-500">
                        Export data to see output here
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    Import Data
                  </CardTitle>
                  <CardDescription>
                    Import data from CSV or JSON files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Select File</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileSelect}
                        className="flex-1"
                      />
                      {importFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setImportFile(null)
                            setImportPreview(null)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* File Preview */}
                  {importPreview && (
                    <div className="rounded-lg border p-4 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {importPreview.format === 'csv' ? (
                            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <FileJson className="h-5 w-5 text-blue-500" />
                          )}
                          <span className="font-medium">
                            {importPreview.fileName}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewSheetOpen(true)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
                        <span>{importPreview.rowCount} rows</span>
                        <span>{importPreview.columns.length} columns</span>
                      </div>
                    </div>
                  )}

                  {/* Target Table */}
                  <div className="space-y-2">
                    <Label>Target Table</Label>
                    <Select
                      value={selectedImportTable}
                      onValueChange={setSelectedImportTable}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose target table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLE_TABLES.map((table) => (
                          <SelectItem key={table.name} value={table.name}>
                            {table.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Import Button */}
                  <Button
                    onClick={handleImport}
                    disabled={
                      !importFile || !selectedImportTable || isImporting
                    }
                    className="w-full"
                    size="lg"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Data
                      </>
                    )}
                  </Button>

                  {/* Command Preview */}
                  <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Terminal className="h-4 w-4" />
                      <span>Command:</span>
                    </div>
                    <div className="mt-2">
                      $ nself db import
                      {importFile ? ` --file="${importFile.name}"` : ''}
                      {selectedImportTable
                        ? ` --table=${selectedImportTable}`
                        : ''}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CLI Output */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    CLI Output
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80 rounded-lg bg-zinc-950 p-4">
                    {importOutput ? (
                      <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                        {importOutput}
                      </pre>
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-500">
                        Import data to see output here
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Preview Sheet */}
            <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
              <SheetContent className="w-[600px] sm:max-w-[600px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Import Preview
                  </SheetTitle>
                  <SheetDescription>
                    Preview of data to be imported
                  </SheetDescription>
                </SheetHeader>
                {importPreview && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline">
                        {importPreview.format.toUpperCase()}
                      </Badge>
                      <span>{importPreview.rowCount} rows</span>
                      <span>{importPreview.columns.length} columns</span>
                    </div>
                    <ScrollArea className="h-[400px] rounded-lg border dark:border-zinc-700">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {importPreview.columns.map((col) => (
                              <TableHead key={col}>{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.sampleRows.map((row, i) => (
                            <TableRow key={i}>
                              {importPreview.columns.map((col) => (
                                <TableCell
                                  key={col}
                                  className="font-mono text-xs"
                                >
                                  {row[col]}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    <p className="text-xs text-zinc-500">
                      Showing first {importPreview.sampleRows.length} of{' '}
                      {importPreview.rowCount} rows
                    </p>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </TabsContent>

          {/* Anonymize Tab */}
          <TabsContent value="anonymize" className="mt-6">
            <div className="space-y-6">
              {/* Warning Alert */}
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-500">
                  Caution: Destructive Operation
                </AlertTitle>
                <AlertDescription>
                  Anonymization permanently modifies data. This should only be
                  used on non-production databases or before sharing data for
                  development/testing purposes.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-sky-500" />
                      PII Detection
                    </CardTitle>
                    <CardDescription>
                      Scan database for personally identifiable information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scan Button */}
                    <Button
                      onClick={handleScanPII}
                      disabled={isScanning}
                      variant="outline"
                      className="w-full"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Scan for PII Fields
                        </>
                      )}
                    </Button>

                    {/* PII Fields List */}
                    {piiFields.length > 0 && (
                      <ScrollArea className="h-64 rounded-lg border dark:border-zinc-700">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10"></TableHead>
                              <TableHead>Field</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Sample</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {piiFields.map((field, index) => (
                              <TableRow key={`${field.table}-${field.column}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={field.selected}
                                    onCheckedChange={() =>
                                      togglePIIField(index)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono text-xs">
                                    <span className="text-zinc-500">
                                      {field.table}.
                                    </span>
                                    {field.column}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={getPIITypeBadge(field.type)}
                                  >
                                    {field.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate font-mono text-xs text-zinc-500">
                                  {field.sampleValue}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPiiFields((prev) =>
                            prev.map((f) => ({ ...f, selected: true })),
                          )
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPiiFields((prev) =>
                            prev.map((f) => ({ ...f, selected: false })),
                          )
                        }
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        Deselect All
                      </Button>
                    </div>

                    {/* Progress */}
                    {isAnonymizing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Anonymizing...</span>
                          <span>{Math.round(anonymizeProgress)}%</span>
                        </div>
                        <Progress value={anonymizeProgress} />
                      </div>
                    )}

                    {/* Anonymize Button */}
                    <Button
                      onClick={handleAnonymize}
                      disabled={
                        piiFields.filter((f) => f.selected).length === 0 ||
                        isAnonymizing
                      }
                      className="w-full bg-sky-500 hover:bg-sky-600"
                      size="lg"
                    >
                      {isAnonymizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Anonymizing...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Anonymize Selected Fields (
                          {piiFields.filter((f) => f.selected).length})
                        </>
                      )}
                    </Button>

                    {/* Command Preview */}
                    <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Terminal className="h-4 w-4" />
                        <span>Command:</span>
                      </div>
                      <div className="mt-2">
                        $ nself db anonymize
                        {piiFields.filter((f) => f.selected).length > 0 &&
                          ` --fields="${piiFields
                            .filter((f) => f.selected)
                            .map((f) => `${f.table}.${f.column}`)
                            .join(',')}"`}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CLI Output */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      CLI Output
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80 rounded-lg bg-zinc-950 p-4">
                      {anonymizeOutput ? (
                        <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                          {anonymizeOutput}
                        </pre>
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-500">
                          Scan or anonymize to see output here
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Anonymization Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Anonymization Methods
                  </CardTitle>
                  <CardDescription>
                    How different PII types are anonymized
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <Badge className="mb-2 bg-blue-500/10 text-blue-500">
                        email
                      </Badge>
                      <p className="text-xs text-zinc-500">
                        user@domain.com to user_abc123@example.com
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <Badge className="mb-2 bg-sky-500/10 text-sky-500">
                        name
                      </Badge>
                      <p className="text-xs text-zinc-500">
                        Real names to fake names using Faker
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <Badge className="mb-2 bg-green-500/10 text-green-500">
                        phone
                      </Badge>
                      <p className="text-xs text-zinc-500">
                        Replace with (555) 000-XXXX format
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <Badge className="mb-2 bg-orange-500/10 text-orange-500">
                        address
                      </Badge>
                      <p className="text-xs text-zinc-500">
                        Replace with generic addresses
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <Badge className="mb-2 bg-red-500/10 text-red-500">
                        ssn
                      </Badge>
                      <p className="text-xs text-zinc-500">
                        Replace with XXX-XX-XXXX format
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <Badge className="mb-2 bg-cyan-500/10 text-cyan-500">
                        ip
                      </Badge>
                      <p className="text-xs text-zinc-500">
                        Replace with 10.0.0.X or 192.168.X.X
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTemplate>
  )
}

export default function DatabaseDataPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DatabaseDataContent />
    </Suspense>
  )
}
