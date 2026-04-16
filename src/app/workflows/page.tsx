'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkflowList } from '@/components/workflows'
import { useWorkflows, useWorkflowStats } from '@/hooks/useWorkflows'
import {
  Activity,
  CheckCircle,
  Clock,
  Plus,
  TrendingUp,
  Workflow,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function WorkflowsPage() {
  const router = useRouter()
  const { workflows, isLoading: workflowsLoading } = useWorkflows()
  const { stats, isLoading: statsLoading } = useWorkflowStats()

  const isLoading = workflowsLoading || statsLoading

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Automate tasks with visual workflows"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Workflows' }]}
        actions={
          <Link href="/workflows/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </Link>
        }
      />
      <PageContent>
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Workflow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Workflows</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.totalWorkflows ?? workflows.length}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Active</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.activeWorkflows ?? 0}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Clock className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Total Executions
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.totalExecutions ?? 0}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Success Rate</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.successRate !== undefined
                      ? `${Math.round(stats.successRate * 100)}%`
                      : 'N/A'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Executions Summary */}
        {stats?.recentExecutions && stats.recentExecutions.length > 0 && (
          <Card className="mb-6 p-4">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Recent Activity
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.recentExecutions.slice(0, 5).map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center gap-2 rounded-md border bg-zinc-50 px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {execution.status === 'completed' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                  <span className="font-mono text-xs">
                    {execution.id.slice(0, 8)}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {new Date(execution.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Workflow List */}
        <WorkflowList
          onCreateClick={() => router.push('/workflows/new')}
          onEditClick={(workflowId) => router.push(`/workflows/${workflowId}`)}
        />
      </PageContent>
    </>
  )
}
