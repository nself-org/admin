'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useDownloadReport, useGenerateReport, useReportExecution } from '@/hooks/useReports'
import type { GenerateReportInput, ReportFormat, ReportStatus } from '@/types/report'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ReportExecutionStatusProps {
  executionId: string
  onCompleted?: (fileUrl: string) => void
  onFailed?: (error: string) => void
  onRetry?: () => void
  retryInput?: GenerateReportInput
}

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5" />,
  excel: <FileSpreadsheet className="h-5 w-5" />,
  csv: <FileSpreadsheet className="h-5 w-5" />,
  json: <FileJson className="h-5 w-5" />,
  html: <FileText className="h-5 w-5" />,
}

const statusConfig: Record<
  ReportStatus,
  {
    icon: React.ReactNode
    title: string
    description: string
    color: string
  }
> = {
  pending: {
    icon: <Clock className="h-8 w-8" />,
    title: 'Report Queued',
    description: 'Your report is in the queue and will start generating shortly.',
    color: 'text-zinc-400',
  },
  generating: {
    icon: <Loader2 className="h-8 w-8 animate-spin" />,
    title: 'Generating Report',
    description: 'Please wait while we generate your report...',
    color: 'text-blue-400',
  },
  completed: {
    icon: <CheckCircle2 className="h-8 w-8" />,
    title: 'Report Ready',
    description: 'Your report has been generated and is ready for download.',
    color: 'text-emerald-400',
  },
  failed: {
    icon: <XCircle className="h-8 w-8" />,
    title: 'Generation Failed',
    description: 'An error occurred while generating your report.',
    color: 'text-red-400',
  },
  expired: {
    icon: <AlertCircle className="h-8 w-8" />,
    title: 'Report Expired',
    description: 'This report has expired. Please generate a new report to download.',
    color: 'text-amber-400',
  },
}

export function ReportExecutionStatus({
  executionId,
  onCompleted,
  onFailed,
  onRetry,
  retryInput,
}: ReportExecutionStatusProps) {
  const { execution, isLoading, refresh } = useReportExecution(executionId)
  const { download, isDownloading } = useDownloadReport()
  const { generate, isGenerating } = useGenerateReport()
  const [progress, setProgress] = useState(0)
  const [previousStatus, setPreviousStatus] = useState<ReportStatus | null>(null)

  // Simulate progress for generating state
  useEffect(() => {
    if (execution?.status === 'generating') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Slow down as we approach 90%
          const increment = prev < 50 ? 5 : prev < 75 ? 2 : 1
          return Math.min(prev + increment, 90)
        })
      }, 500)

      return () => clearInterval(interval)
    } else if (execution?.status === 'completed') {
      setProgress(100)
    }
  }, [execution?.status])

  // Track status changes for callbacks
  useEffect(() => {
    if (!execution) return

    if (previousStatus !== 'completed' && execution.status === 'completed' && execution.fileUrl) {
      onCompleted?.(execution.fileUrl)
    }

    if (previousStatus !== 'failed' && execution.status === 'failed' && execution.error) {
      onFailed?.(execution.error)
    }

    setPreviousStatus(execution.status)
  }, [execution, previousStatus, onCompleted, onFailed])

  const handleDownload = async () => {
    if (!execution?.fileUrl) return

    const filename = `report-${executionId}-${new Date().toISOString().split('T')[0]}.${execution.format}`
    await download(executionId, filename)
  }

  const handleRetry = async () => {
    if (onRetry) {
      onRetry()
    } else if (retryInput) {
      await generate(retryInput)
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDuration = (start?: string, end?: string): string => {
    if (!start) return ''
    const endTime = end ? new Date(end) : new Date()
    const duration = (endTime.getTime() - new Date(start).getTime()) / 1000

    if (duration < 60) return `${duration.toFixed(1)} seconds`
    return `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`
  }

  if (isLoading) {
    return (
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!execution) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Execution not found</AlertTitle>
        <AlertDescription>
          The report execution could not be found. It may have been deleted.
        </AlertDescription>
      </Alert>
    )
  }

  const config = statusConfig[execution.status]

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Status Icon */}
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 ${config.color}`}
          >
            {config.icon}
          </div>

          {/* Status Title and Description */}
          <div>
            <h3 className="text-lg font-semibold text-white">{config.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{execution.error || config.description}</p>
          </div>

          {/* Progress Bar (for generating state) */}
          {execution.status === 'generating' && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-zinc-500">
                {progress < 90 ? `${progress}% complete` : 'Finalizing...'}
              </p>
            </div>
          )}

          {/* File Info (for completed state) */}
          {execution.status === 'completed' && (
            <div className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                {formatIcons[execution.format]}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">
                  {execution.format.toUpperCase()} Report
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  {execution.fileSize && <span>{formatFileSize(execution.fileSize)}</span>}
                  {execution.rowCount !== undefined && (
                    <>
                      <span>-</span>
                      <span>{execution.rowCount.toLocaleString()} rows</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Duration (for completed or generating) */}
          {(execution.status === 'completed' || execution.status === 'generating') && (
            <p className="text-xs text-zinc-500">
              {execution.status === 'completed' ? 'Generated in ' : 'Running for '}
              {formatDuration(execution.startedAt, execution.completedAt)}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Refresh button for pending/generating */}
            {(execution.status === 'pending' || execution.status === 'generating') && (
              <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            )}

            {/* Download button for completed */}
            {execution.status === 'completed' && execution.fileUrl && (
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Report
                  </>
                )}
              </Button>
            )}

            {/* Retry button for failed/expired */}
            {(execution.status === 'failed' || execution.status === 'expired') &&
              (onRetry || retryInput) && (
                <Button
                  onClick={handleRetry}
                  disabled={isGenerating}
                  variant="outline"
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </>
                  )}
                </Button>
              )}
          </div>

          {/* Expiration Warning */}
          {execution.status === 'completed' && execution.expiresAt && (
            <p className="text-xs text-amber-500">
              This download link expires{' '}
              {new Date(execution.expiresAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
