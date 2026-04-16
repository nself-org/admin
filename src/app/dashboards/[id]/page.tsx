'use client'

import { DashboardGrid } from '@/components/dashboards'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { useDashboard } from '@/hooks/useDashboards'
import {
  ArrowLeft,
  Clock,
  Edit,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Share2,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function ViewDashboardPage() {
  const params = useParams()
  const dashboardId = params.id as string
  const { dashboard, isLoading, refresh } = useDashboard(dashboardId)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  const handleShare = async () => {
    if (dashboard) {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Dashboard link copied to clipboard!')
      } catch (_error) {
        // Handle error silently
      }
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Dashboards', href: '/dashboards' },
            { label: 'Loading...' },
          ]}
        />
        <PageContent>
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        </PageContent>
      </>
    )
  }

  if (!dashboard) {
    return (
      <>
        <PageHeader
          title="Dashboard Not Found"
          breadcrumbs={[
            { label: 'Dashboards', href: '/dashboards' },
            { label: 'Not Found' },
          ]}
        />
        <PageContent>
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <LayoutDashboard className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Dashboard not found
            </h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              The dashboard you are looking for does not exist or has been
              deleted.
            </p>
            <Link href="/dashboards">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboards
              </Button>
            </Link>
          </Card>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={dashboard.name}
        description={dashboard.description}
        breadcrumbs={[
          { label: 'Dashboards', href: '/dashboards' },
          { label: dashboard.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Link href={`/dashboards/${dashboardId}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />
      <PageContent>
        {/* Dashboard Info Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            <span>{dashboard.widgets.length} widgets</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>{dashboard.columns || 12} columns</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
            </span>
          </div>
          {dashboard.refreshInterval && (
            <div className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>Auto-refresh: {dashboard.refreshInterval}s</span>
            </div>
          )}
          {dashboard.isDefault && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
              Default Dashboard
            </span>
          )}
          {dashboard.isPublic && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Public
            </span>
          )}
        </div>

        {/* Dashboard Grid - View Only */}
        <DashboardGrid dashboard={dashboard} editable={false} />
      </PageContent>
    </>
  )
}
