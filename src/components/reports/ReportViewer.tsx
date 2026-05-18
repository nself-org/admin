'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDownloadReport, useReportExecution, useReportTemplate } from '@/hooks/useReports'
import type { ReportColumn, ReportFormat, ReportStatus } from '@/types/report'
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  MailPlus,
  RefreshCw,
  Rows3,
  Share2,
} from 'lucide-react'

interface ReportViewerProps {
  executionId: string
  onSchedule?: () => void
  onShare?: () => void
  previewData?: Record<string, unknown>[]
}

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileJson className="h-4 w-4" />,
  html: <FileText className="h-4 w-4" />,
}

const statusColors: Record<ReportStatus, string> = {
  pending: 'bg-zinc-500',
  generating: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  expired: 'bg-amber-500',
}

const statusLabels: Record<ReportStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
}

export function ReportViewer({ executionId, onSchedule, onShare, previewData }: ReportViewerProps) {
  const { execution, isLoading: isLoadingExecution, refresh } = useReportExecution(executionId)
  const { template, isLoading: isLoadingTemplate } = useReportTemplate(execution?.reportId)
  const { download, isDownloading } = useDownloadReport()

  const isLoading = isLoadingExecution || isLoadingTemplate

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (start?: string, end?: string): string => {
    if (!start || !end) return 'N/A'
    const duration = (new Date(end).getTime() - new Date(start).getTime()) / 1000
    if (duration < 60) return `${duration.toFixed(1)}s`
    return `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`
  }

  const handleDownload = async () => {
    if (!execution) return
    const filename = `report-${template?.name || executionId}-${new Date().toISOString().split('T')[0]}.${execution.format}`
    await download(executionId, filename)
  }

  const formatCellValue = (value: unknown, column: ReportColumn): React.ReactNode => {
    if (value === null || value === undefined) return '-'

    switch (column.type) {
      case 'date':
        return formatDate(String(value))
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(value))
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value))
      case 'boolean':
        return value ? 'Yes' : 'No'
      default:
        return String(value)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!execution) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Report not found</AlertTitle>
        <AlertDescription>
          The report execution could not be found. It may have been deleted or expired.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">{template?.name || 'Report'}</h2>
            <Badge className={`${statusColors[execution.status]} text-white`}>
              {statusLabels[execution.status]}
            </Badge>
          </div>
          {template?.description && (
            <p className="mt-1 text-sm text-zinc-400">{template.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {onSchedule && (
            <Button variant="outline" size="sm" onClick={onSchedule} className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              Schedule
            </Button>
          )}
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare} className="gap-1">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                {formatIcons[execution.format]}
                Format
              </div>
              <p className="font-medium text-white">{execution.format.toUpperCase()}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Rows3 className="h-3.5 w-3.5" />
                Rows
              </div>
              <p className="font-medium text-white">
                {execution.rowCount?.toLocaleString() || 'Processing...'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </div>
              <p className="font-medium text-white">{formatDate(execution.startedAt)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                Duration
              </div>
              <p className="font-medium text-white">
                {formatDuration(execution.startedAt, execution.completedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {execution.status === 'failed' && execution.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Report generation failed</AlertTitle>
          <AlertDescription>{execution.error}</AlertDescription>
        </Alert>
      )}

      {/* Expired State */}
      {execution.status === 'expired' && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Report expired</AlertTitle>
          <AlertDescription>
            This report has expired and the file is no longer available for download. Please
            generate a new report.
          </AlertDescription>
        </Alert>
      )}

      {/* Data Preview */}
      {previewData && previewData.length > 0 && template && (
        <Card className="border-zinc-700/50 bg-zinc-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white">Data Preview</CardTitle>
              <span className="text-xs text-zinc-500">
                Showing first {Math.min(previewData.length, 10)} rows
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border border-zinc-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
                    {template.columns.map((column) => (
                      <TableHead
                        key={column.id}
                        className="text-zinc-400"
                        style={{ width: column.width }}
                      >
                        {column.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="border-zinc-700 hover:bg-zinc-800/50">
                      {template.columns.map((column) => (
                        <TableCell key={column.id} className="text-white">
                          {formatCellValue(row[column.field], column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Actions */}
      {execution.status === 'completed' && execution.fileUrl && (
        <Card className="border-zinc-700/50 bg-zinc-800/50">
          <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                {formatIcons[execution.format]}
              </div>
              <div>
                <p className="font-medium text-white">Report Ready</p>
                <p className="text-sm text-zinc-500">
                  {formatFileSize(execution.fileSize)}
                  {execution.expiresAt && ` - Expires ${formatDate(execution.expiresAt)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-1"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Email functionality would go here
                }}
                className="gap-1"
              >
                <MailPlus className="h-3.5 w-3.5" />
                Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating State */}
      {execution.status === 'generating' && (
        <Card className="border-zinc-700/50 bg-zinc-800/50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <div>
              <p className="font-medium text-white">Generating report...</p>
              <p className="text-sm text-zinc-500">
                This may take a few moments depending on the data size.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending State */}
      {execution.status === 'pending' && (
        <Card className="border-zinc-700/50 bg-zinc-800/50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Clock className="h-8 w-8 text-zinc-400" />
            <div>
              <p className="font-medium text-white">Report queued</p>
              <p className="text-sm text-zinc-500">
                Your report is in the queue and will start generating shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
