'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDownloadReport, useReportExecutions } from '@/hooks/useReports'
import type { ReportFormat, ReportStatus } from '@/types/report'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'generating', label: 'Generating' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
]

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
]

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileJson className="h-4 w-4" />,
  html: <FileText className="h-4 w-4" />,
}

const statusConfig: Record<ReportStatus, { color: string; icon: React.ReactNode }> = {
  pending: {
    color: 'bg-zinc-500/10 text-zinc-400',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  generating: {
    color: 'bg-blue-500/10 text-blue-400',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  completed: {
    color: 'bg-green-500/10 text-green-400',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    color: 'bg-red-500/10 text-red-400',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  expired: {
    color: 'bg-amber-500/10 text-amber-400',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
}

function ExecutionsContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')

  const { executions, isLoading, refresh } = useReportExecutions(undefined, {
    status: statusFilter !== 'all' ? (statusFilter as ReportStatus) : undefined,
  })

  const { download, isDownloading } = useDownloadReport()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filteredExecutions = useMemo(() => {
    return executions.filter((execution) => {
      // Format filter
      if (formatFilter !== 'all' && execution.format !== formatFilter) {
        return false
      }

      // Search filter (search by ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!execution.id.toLowerCase().includes(query)) {
          return false
        }
      }

      return true
    })
  }, [executions, formatFilter, searchQuery])

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (start: string, end?: string): string => {
    if (!end) return '-'
    const duration = (new Date(end).getTime() - new Date(start).getTime()) / 1000
    if (duration < 60) return `${duration.toFixed(1)}s`
    return `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = async (executionId: string, format: ReportFormat) => {
    setDownloadingId(executionId)
    try {
      const filename = `report-${executionId}-${new Date().toISOString().split('T')[0]}.${format}`
      await download(executionId, filename)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleViewExecution = (executionId: string) => {
    router.push(`/reports/executions/${executionId}`)
  }

  // Stats calculation
  const stats = useMemo(() => {
    const total = executions.length
    const completed = executions.filter((e) => e.status === 'completed').length
    const failed = executions.filter((e) => e.status === 'failed').length
    const pending = executions.filter(
      (e) => e.status === 'pending' || e.status === 'generating'
    ).length

    return { total, completed, failed, pending }
  }, [executions])

  return (
    <>
      <PageHeader
        title="Report Execution History"
        description="View and manage all generated reports"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Reports', href: '/reports' },
          { label: 'Executions' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Link href="/reports">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Reports
              </Button>
            </Link>
          </div>
        }
      />
      <PageContent>
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border-zinc-700/50 bg-zinc-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Executions</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-700/50 bg-zinc-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Completed</p>
                  <p className="mt-1 text-2xl font-semibold text-green-400">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-700/50 bg-zinc-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Failed</p>
                  <p className="mt-1 text-2xl font-semibold text-red-400">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-700/50 bg-zinc-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">In Progress</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-400">{stats.pending}</p>
                </div>
                <Loader2 className="h-8 w-8 text-blue-600/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-zinc-700/50 bg-zinc-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by execution ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-zinc-700 bg-zinc-900 pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 border-zinc-700 bg-zinc-900">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formatFilter} onValueChange={setFormatFilter}>
                  <SelectTrigger className="w-36 border-zinc-700 bg-zinc-900">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executions Table */}
        <Card className="border-zinc-700/50 bg-zinc-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">
              Executions ({filteredExecutions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ) : filteredExecutions.length > 0 ? (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
                      <TableHead className="text-zinc-400">ID</TableHead>
                      <TableHead className="text-zinc-400">Format</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Started</TableHead>
                      <TableHead className="text-zinc-400">Duration</TableHead>
                      <TableHead className="text-zinc-400">Rows</TableHead>
                      <TableHead className="text-zinc-400">Size</TableHead>
                      <TableHead className="text-right text-zinc-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExecutions.map((execution) => (
                      <TableRow
                        key={execution.id}
                        className="cursor-pointer border-zinc-700 hover:bg-zinc-700/30"
                        onClick={() => handleViewExecution(execution.id)}
                      >
                        <TableCell className="font-mono text-sm text-white">
                          {execution.id.slice(0, 12)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">{formatIcons[execution.format]}</span>
                            <span className="text-sm text-white">
                              {execution.format.toUpperCase()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${statusConfig[execution.status].color}`}>
                            {statusConfig[execution.status].icon}
                            {execution.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-400">
                          {formatDate(execution.startedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-400">
                          {formatDuration(execution.startedAt, execution.completedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-400">
                          {execution.rowCount?.toLocaleString() ?? '-'}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-400">
                          {formatFileSize(execution.fileSize)}
                        </TableCell>
                        <TableCell className="text-right">
                          {execution.status === 'completed' && execution.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isDownloading && downloadingId === execution.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(execution.id, execution.format)
                              }}
                              className="gap-1 text-emerald-400 hover:text-emerald-300"
                            >
                              {isDownloading && downloadingId === execution.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              Download
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="mb-4 h-12 w-12 text-zinc-600" />
                <h3 className="mb-2 text-lg font-medium text-white">No executions found</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  {searchQuery || statusFilter !== 'all' || formatFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Generate your first report to see execution history'}
                </p>
                <Link href="/reports">
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                    <FileText className="h-4 w-4" />
                    Go to Reports
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  )
}

export default function ReportExecutionsPage() {
  return <ExecutionsContent />
}
