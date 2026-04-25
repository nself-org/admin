'use client'

import { ReportTemplateList } from '@/components/reports'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReportStats, useReportTemplates } from '@/hooks/useReports'
import { useUrlState } from '@/hooks/useUrlState'
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  PlayCircle,
  Server,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

const CATEGORIES = [
  { value: 'all', label: 'All', icon: FileText },
  { value: 'infrastructure', label: 'Infrastructure', icon: Server },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
]

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-400">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-zinc-500">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
            <Icon className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportsContent() {
  const [category, setCategory] = useUrlState<string>('tab', 'all')
  const { templates: _templates, isLoading: isLoadingTemplates } =
    useReportTemplates(category === 'all' ? undefined : category)
  const { stats, isLoading: isLoadingStats } = useReportStats()

  const handleCategoryChange = (value: string) => {
    setCategory(value)
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and schedule reports for infrastructure, security, and analytics"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]}
        actions={
          <Link href="/reports/executions">
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" />
              View History
            </Button>
          </Link>
        }
      />
      <PageContent>
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingStats ? (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : (
            <>
              <StatsCard
                title="Total Templates"
                value={stats?.totalTemplates ?? 0}
                icon={FileText}
                description="Available report templates"
              />
              <StatsCard
                title="Total Executions"
                value={stats?.totalExecutions ?? 0}
                icon={PlayCircle}
                description="Reports generated"
              />
              <StatsCard
                title="Scheduled Reports"
                value={stats?.totalScheduled ?? 0}
                icon={Calendar}
                description="Active schedules"
              />
              <StatsCard
                title="Completed Today"
                value={stats?.byStatus?.completed ?? 0}
                icon={CheckCircle2}
                description="Successfully generated"
              />
            </>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={category} onValueChange={handleCategoryChange}>
          <TabsList className="mb-6 border-zinc-700 bg-zinc-800/50">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="gap-2 data-[state=active]:bg-zinc-700"
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="mt-0">
              {isLoadingTemplates ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <ReportTemplateList
                  category={cat.value === 'all' ? undefined : cat.value}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Recent Executions */}
        {stats?.recentExecutions && stats.recentExecutions.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Recent Executions
              </h2>
              <Link
                href="/reports/executions"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                View All
              </Link>
            </div>
            <Card className="border-zinc-700/50 bg-zinc-800/50">
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-700/50">
                  {stats.recentExecutions.slice(0, 5).map((execution) => (
                    <Link
                      key={execution.id}
                      href={`/reports/executions/${execution.id}`}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-zinc-700/30"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            execution.status === 'completed'
                              ? 'bg-green-500/10 text-green-400'
                              : execution.status === 'failed'
                                ? 'bg-red-500/10 text-red-400'
                                : execution.status === 'generating'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-zinc-500/10 text-zinc-400'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            Report #{execution.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {execution.format.toUpperCase()} -{' '}
                            {new Date(execution.startedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContent>
    </>
  )
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsContent />
    </Suspense>
  )
}
