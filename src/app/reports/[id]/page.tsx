'use client'

import {
  ReportBuilder,
  ReportExecutionStatus,
  ReportScheduleForm,
} from '@/components/reports'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useReportExecutions,
  useReportSchedules,
  useReportTemplate,
} from '@/hooks/useReports'
import { useUrlState } from '@/hooks/useUrlState'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  History,
  Play,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

type ViewMode = 'build' | 'execution' | 'schedule'

function ReportDetailContent() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const {
    template,
    isLoading: isLoadingTemplate,
    isError,
  } = useReportTemplate(templateId)
  const { executions, isLoading: isLoadingExecutions } =
    useReportExecutions(templateId)
  const { schedules, isLoading: isLoadingSchedules } =
    useReportSchedules(templateId)

  const [viewMode, setViewMode] = useState<ViewMode>('build')
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(
    null,
  )
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'generate')

  const handleGenerated = (executionId: string) => {
    setActiveExecutionId(executionId)
    setViewMode('execution')
  }

  const handleScheduleSaved = () => {
    setActiveTab('schedules')
  }

  const handleViewExecution = (executionId: string) => {
    router.push(`/reports/executions/${executionId}`)
  }

  if (isLoadingTemplate) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports' },
            { label: 'Loading...' },
          ]}
        />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </PageContent>
      </>
    )
  }

  if (isError || !template) {
    return (
      <>
        <PageHeader
          title="Report Not Found"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Reports', href: '/reports' },
            { label: 'Not Found' },
          ]}
          actions={
            <Link href="/reports">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Reports
              </Button>
            </Link>
          }
        />
        <PageContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Template not found</AlertTitle>
            <AlertDescription>
              The report template you are looking for does not exist or has been
              deleted.
            </AlertDescription>
          </Alert>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={template.name}
        description={template.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Reports', href: '/reports' },
          { label: template.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        }
      />
      <PageContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 border-zinc-700 bg-zinc-800/50">
            <TabsTrigger
              value="generate"
              className="gap-2 data-[state=active]:bg-zinc-700"
            >
              <Play className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-2 data-[state=active]:bg-zinc-700"
            >
              <History className="h-4 w-4" />
              History
              {executions.length > 0 && (
                <span className="ml-1 rounded-full bg-zinc-600 px-1.5 py-0.5 text-xs">
                  {executions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="schedules"
              className="gap-2 data-[state=active]:bg-zinc-700"
            >
              <Calendar className="h-4 w-4" />
              Schedules
              {schedules.length > 0 && (
                <span className="ml-1 rounded-full bg-zinc-600 px-1.5 py-0.5 text-xs">
                  {schedules.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="mt-0">
            {viewMode === 'build' && (
              <ReportBuilder
                templateId={templateId}
                onGenerated={handleGenerated}
              />
            )}

            {viewMode === 'execution' && activeExecutionId && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Report Generation
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewMode('build')
                      setActiveExecutionId(null)
                    }}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Generate Another
                  </Button>
                </div>
                <ReportExecutionStatus
                  executionId={activeExecutionId}
                  onCompleted={() => {
                    // Optionally switch to viewer mode
                  }}
                  onRetry={() => {
                    setViewMode('build')
                    setActiveExecutionId(null)
                  }}
                />
              </div>
            )}

            {viewMode === 'schedule' && (
              <ReportScheduleForm
                reportId={templateId}
                onSaved={handleScheduleSaved}
                onCancel={() => setViewMode('build')}
              />
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            <Card className="border-zinc-700/50 bg-zinc-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <History className="h-4 w-4" />
                  Execution History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingExecutions ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : executions.length > 0 ? (
                  <div className="space-y-3">
                    {executions.map((execution) => (
                      <div
                        key={execution.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-700 p-4 transition-colors hover:border-emerald-500/50 hover:bg-zinc-700/30"
                        onClick={() => handleViewExecution(execution.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              execution.status === 'completed'
                                ? 'bg-green-500/10 text-green-400'
                                : execution.status === 'failed'
                                  ? 'bg-red-500/10 text-red-400'
                                  : execution.status === 'generating'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'bg-zinc-500/10 text-zinc-400'
                            }`}
                          >
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {execution.format.toUpperCase()} Report
                            </p>
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                              <Clock className="h-3 w-3" />
                              {new Date(execution.startedAt).toLocaleString()}
                              {execution.rowCount !== undefined && (
                                <>
                                  <span>-</span>
                                  <span>
                                    {execution.rowCount.toLocaleString()} rows
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            execution.status === 'completed'
                              ? 'bg-green-500/10 text-green-400'
                              : execution.status === 'failed'
                                ? 'bg-red-500/10 text-red-400'
                                : execution.status === 'generating'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-zinc-500/10 text-zinc-400'
                          }`}
                        >
                          {execution.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="mb-4 h-12 w-12 text-zinc-600" />
                    <h3 className="mb-2 text-lg font-medium text-white">
                      No executions yet
                    </h3>
                    <p className="mb-4 text-sm text-zinc-400">
                      Generate your first report to see execution history
                    </p>
                    <Button
                      onClick={() => setActiveTab('generate')}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Play className="h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="mt-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Scheduled Reports
                </h2>
                <Button
                  onClick={() => {
                    setViewMode('schedule')
                    setActiveTab('generate')
                  }}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                >
                  <Calendar className="h-4 w-4" />
                  New Schedule
                </Button>
              </div>

              {isLoadingSchedules ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : schedules.length > 0 ? (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <Card
                      key={schedule.id}
                      className="border-zinc-700/50 bg-zinc-800/50"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                schedule.enabled
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-zinc-500/10 text-zinc-400'
                              }`}
                            >
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {schedule.frequency.charAt(0).toUpperCase() +
                                  schedule.frequency.slice(1)}{' '}
                                - {schedule.format.toUpperCase()}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Clock className="h-3 w-3" />
                                {schedule.time} ({schedule.timezone})
                                {schedule.nextRun && (
                                  <>
                                    <span>-</span>
                                    <span>
                                      Next:{' '}
                                      {new Date(
                                        schedule.nextRun,
                                      ).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              schedule.enabled
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-zinc-500/10 text-zinc-400'
                            }`}
                          >
                            {schedule.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        {schedule.recipients.length > 0 && (
                          <div className="mt-3 border-t border-zinc-700/50 pt-3">
                            <p className="text-xs text-zinc-500">
                              Recipients: {schedule.recipients.join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-zinc-700/50 bg-zinc-800/50">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="mb-4 h-12 w-12 text-zinc-600" />
                    <h3 className="mb-2 text-lg font-medium text-white">
                      No schedules configured
                    </h3>
                    <p className="mb-4 text-sm text-zinc-400">
                      Set up automatic report generation on a schedule
                    </p>
                    <Button
                      onClick={() => {
                        setViewMode('schedule')
                        setActiveTab('generate')
                      }}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Calendar className="h-4 w-4" />
                      Create Schedule
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  )
}

export default function ReportDetailPage() {
  return (
    <Suspense>
      <ReportDetailContent />
    </Suspense>
  )
}
