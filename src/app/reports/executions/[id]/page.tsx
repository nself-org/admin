'use client'

import { ReportViewer } from '@/components/reports'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useReportExecution, useReportTemplate } from '@/hooks/useReports'
import { AlertCircle, ArrowLeft, FileText, Play } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

function ExecutionDetailContent() {
  const params = useParams()
  const router = useRouter()
  const executionId = params.id as string

  const {
    execution,
    isLoading: isLoadingExecution,
    isError: isExecutionError,
  } = useReportExecution(executionId)
  const { template, isLoading: isLoadingTemplate } = useReportTemplate(execution?.reportId)

  const isLoading = isLoadingExecution || isLoadingTemplate

  const handleSchedule = () => {
    if (execution?.reportId) {
      router.push(`/reports/${execution.reportId}?tab=schedules`)
    }
  }

  const handleShare = () => {
    // Copy the current URL to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      // Could add a toast notification here
    }
  }

  const handleGenerateAnother = () => {
    if (execution?.reportId) {
      router.push(`/reports/${execution.reportId}`)
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports' },
            { label: 'Executions', href: '/reports/executions' },
            { label: 'Loading...' },
          ]}
        />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </>
    )
  }

  if (isExecutionError || !execution) {
    return (
      <>
        <PageHeader
          title="Execution Not Found"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports' },
            { label: 'Executions', href: '/reports/executions' },
            { label: 'Not Found' },
          ]}
          actions={
            <Link href="/reports/executions">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Executions
              </Button>
            </Link>
          }
        />
        <PageContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Execution not found</AlertTitle>
            <AlertDescription>
              The report execution you are looking for does not exist or has been deleted.
            </AlertDescription>
          </Alert>
        </PageContent>
      </>
    )
  }

  const pageTitle = template?.name
    ? `${template.name} - ${execution.format.toUpperCase()}`
    : `Report Execution`

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={template?.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Reports', href: '/reports' },
          { label: 'Executions', href: '/reports/executions' },
          { label: executionId.slice(0, 12) + '...' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {execution.reportId && (
              <Button variant="outline" className="gap-2" onClick={handleGenerateAnother}>
                <Play className="h-4 w-4" />
                Generate Another
              </Button>
            )}
            <Link href="/reports/executions">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        }
      />
      <PageContent>
        <ReportViewer executionId={executionId} onSchedule={handleSchedule} onShare={handleShare} />

        {/* Related Template Info */}
        {template && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Report Template</h2>
            <Link
              href={`/reports/${template.id}`}
              className="block rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{template.name}</h3>
                  {template.description && (
                    <p className="mt-1 text-sm text-zinc-400">{template.description}</p>
                  )}
                </div>
                <span className="rounded-full bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                  {template.category}
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* Execution Metadata */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Execution Details</h2>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <dt className="text-xs text-zinc-500">Execution ID</dt>
                <dd className="mt-1 font-mono text-sm text-white">{execution.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Created By</dt>
                <dd className="mt-1 text-sm text-white">{execution.createdBy || 'System'}</dd>
              </div>
              {execution.scheduleId && (
                <div>
                  <dt className="text-xs text-zinc-500">Schedule ID</dt>
                  <dd className="mt-1 font-mono text-sm text-white">{execution.scheduleId}</dd>
                </div>
              )}
              {execution.filters && execution.filters.length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <dt className="text-xs text-zinc-500">Filters Applied</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {execution.filters.map((filter, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                        >
                          {filter.field} {filter.operator} {String(filter.value)}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </PageContent>
    </>
  )
}

export default function ExecutionDetailPage() {
  return <ExecutionDetailContent />
}
