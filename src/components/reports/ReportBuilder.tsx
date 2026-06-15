'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useGenerateReport, useReportTemplate } from '@/hooks/useReports'
import type {
  GenerateReportInput,
  ReportColumn,
  ReportFilter,
  ReportFormat,
  ReportSort,
} from '@/types/report'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Play,
  SortAsc,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'

interface ReportBuilderProps {
  templateId: string
  onGenerated?: (executionId: string) => void
  onCancel?: () => void
}

type FilterOperator = ReportFilter['operator']

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileJson className="h-4 w-4" />,
  html: <FileText className="h-4 w-4" />,
}

const formatLabels: Record<ReportFormat, string> = {
  pdf: 'PDF Document',
  excel: 'Excel Spreadsheet',
  csv: 'CSV File',
  json: 'JSON Data',
  html: 'HTML Page',
}

const operatorLabels: Record<FilterOperator, string> = {
  eq: 'equals',
  ne: 'not equals',
  gt: 'greater than',
  gte: 'greater or equal',
  lt: 'less than',
  lte: 'less or equal',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'in list',
  between: 'between',
}

export function ReportBuilder({ templateId, onGenerated, onCancel }: ReportBuilderProps) {
  const { template, isLoading: isLoadingTemplate } = useReportTemplate(templateId)
  const { generate, isGenerating, error } = useGenerateReport()

  // Form state
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<ReportFilter[]>([])
  const [sorts, setSorts] = useState<ReportSort[]>([])
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [emailReport, setEmailReport] = useState(false)
  const [recipients, setRecipients] = useState('')

  // Initialize columns when template loads
  const initializeColumns = useCallback(() => {
    if (template && selectedColumns.size === 0) {
      setSelectedColumns(new Set(template.columns.map((c) => c.id)))
      if (template.defaultFilters) {
        setFilters(template.defaultFilters)
      }
      if (template.defaultSort) {
        setSorts(template.defaultSort)
      }
    }
  }, [template, selectedColumns.size])

  // Initialize on template load
  if (template && selectedColumns.size === 0) {
    initializeColumns()
  }

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const handleSelectAllColumns = () => {
    if (template) {
      if (selectedColumns.size === template.columns.length) {
        setSelectedColumns(new Set())
      } else {
        setSelectedColumns(new Set(template.columns.map((c) => c.id)))
      }
    }
  }

  const handleAddFilter = () => {
    if (template && template.columns.length > 0) {
      const filterableColumn = template.columns.find((c) => c.filterable)
      const firstColumn = filterableColumn ?? template.columns[0]
      if (!firstColumn) return
      setFilters((prev) => [
        ...prev,
        {
          field: firstColumn.field,
          operator: 'eq',
          value: '',
        },
      ])
    }
  }

  const handleRemoveFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFilterChange = (
    index: number,
    field: keyof ReportFilter,
    value: string | FilterOperator
  ) => {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  const handleAddSort = () => {
    if (template && template.columns.length > 0) {
      const sortableColumn = template.columns.find((c) => c.sortable)
      const firstColumn = sortableColumn ?? template.columns[0]
      if (!firstColumn) return
      setSorts((prev) => [
        ...prev,
        {
          field: firstColumn.field,
          direction: 'asc',
        },
      ])
    }
  }

  const handleRemoveSort = (index: number) => {
    setSorts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSortChange = (index: number, field: keyof ReportSort, value: string) => {
    setSorts((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const handleGenerate = async () => {
    if (!template) return

    const input: GenerateReportInput = {
      templateId: template.id,
      format,
      filters: filters.length > 0 ? filters : undefined,
      sort: sorts.length > 0 ? sorts : undefined,
      parameters: {
        columns: Array.from(selectedColumns),
      },
      email: emailReport,
      recipients: emailReport ? recipients.split(',').map((e) => e.trim()) : undefined,
    }

    const result = await generate(input)
    if (result?.id) {
      onGenerated?.(result.id)
    }
  }

  const getColumnByField = (field: string): ReportColumn | undefined => {
    return template?.columns.find((c) => c.field === field)
  }

  if (isLoadingTemplate) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!template) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Template not found</AlertTitle>
        <AlertDescription>
          The report template could not be found. Please select a different template.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{template.name}</h2>
          {template.description && (
            <p className="mt-1 text-sm text-zinc-400">{template.description}</p>
          )}
        </div>
        <Badge variant="secondary">{template.category}</Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error generating report</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Column Selection */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Select Columns</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleSelectAllColumns} className="text-xs">
              {selectedColumns.size === template.columns.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {template.columns.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 p-3 hover:border-emerald-500/50"
              >
                <Checkbox
                  checked={selectedColumns.has(column.id)}
                  onCheckedChange={() => handleColumnToggle(column.id)}
                />
                <div className="flex-1 overflow-hidden">
                  <span className="block truncate text-sm text-white">{column.name}</span>
                  <span className="text-xs text-zinc-500">{column.type}</span>
                </div>
              </label>
            ))}
          </div>
          {selectedColumns.size === 0 && (
            <p className="mt-3 text-sm text-amber-500">Please select at least one column</p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddFilter}>
              Add Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filters.length > 0 ? (
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700 p-3"
                >
                  <div className="w-40">
                    <Select
                      value={filter.field}
                      onValueChange={(value) => handleFilterChange(index, 'field', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {template.columns
                          .filter((c) => c.filterable !== false)
                          .map((column) => (
                            <SelectItem key={column.id} value={column.field}>
                              {column.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-36">
                    <Select
                      value={filter.operator}
                      onValueChange={(value) =>
                        handleFilterChange(index, 'operator', value as FilterOperator)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(operatorLabels).map(([op, label]) => (
                          <SelectItem key={op} value={op}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={String(filter.value)}
                      onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                      placeholder={`Enter value for ${getColumnByField(filter.field)?.name || filter.field}`}
                      className="border-zinc-700 bg-zinc-900"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFilter(index)}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No filters applied. Add filters to narrow down the report data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sorting */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <SortAsc className="h-4 w-4" />
              Sort Order
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddSort}>
              Add Sort
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sorts.length > 0 ? (
            <div className="space-y-3">
              {sorts.map((sort, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 p-3"
                >
                  <div className="w-48">
                    <Select
                      value={sort.field}
                      onValueChange={(value) => handleSortChange(index, 'field', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {template.columns
                          .filter((c) => c.sortable !== false)
                          .map((column) => (
                            <SelectItem key={column.id} value={column.field}>
                              {column.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant={sort.direction === 'asc' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange(index, 'direction', 'asc')}
                    className="gap-1"
                  >
                    <ArrowUp className="h-3 w-3" /> Ascending
                  </Button>
                  <Button
                    variant={sort.direction === 'desc' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange(index, 'direction', 'desc')}
                    className="gap-1"
                  >
                    <ArrowDown className="h-3 w-3" /> Descending
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSort(index)}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No sorting applied. Data will be returned in default order.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Format Selection */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Output Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(Object.keys(formatLabels) as ReportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                  format === fmt
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className={format === fmt ? 'text-emerald-400' : 'text-zinc-400'}>
                  {formatIcons[fmt]}
                </div>
                <span className={`text-xs ${format === fmt ? 'text-white' : 'text-zinc-400'}`}>
                  {fmt.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Options */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Email Delivery (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={emailReport}
              onCheckedChange={(checked) => setEmailReport(checked === true)}
            />
            <span className="text-sm text-white">Send report via email when ready</span>
          </label>
          {emailReport && (
            <div className="space-y-2">
              <Label htmlFor="recipients" className="text-zinc-400">
                Recipients (comma-separated)
              </Label>
              <Input
                id="recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="border-zinc-700 bg-zinc-900"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedColumns.size === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-500"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
