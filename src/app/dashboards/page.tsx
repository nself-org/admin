'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { useDashboards, useDashboardStats } from '@/hooks/useDashboards'
import {
  Clock,
  Copy,
  LayoutDashboard,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function DashboardsPage() {
  const { dashboards, isLoading, refresh } = useDashboards()
  const { stats } = useDashboardStats()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this dashboard?')) {
      try {
        await fetch(`/api/dashboards/${id}`, { method: 'DELETE' })
        refresh()
      } catch (_error) {
        // Handle error silently
      }
    }
    setMenuOpen(null)
  }

  const handleClone = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await fetch(`/api/dashboards/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name} (Copy)` }),
      })
      refresh()
    } catch (_error) {
      // Handle error silently
    }
    setMenuOpen(null)
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Dashboards"
          description="Create and manage custom dashboards"
        />
        <PageContent>
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboards"
        description="Create and manage custom dashboards"
        actions={
          <Link href="/dashboards/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Dashboard
            </Button>
          </Link>
        }
      />
      <PageContent>
        {/* Stats Overview */}
        {stats && (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <LayoutDashboard className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Total Dashboards
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {stats.totalDashboards}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Total Widgets
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {stats.totalWidgets}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Most Viewed
                  </p>
                  <p className="truncate text-lg font-bold text-zinc-900 dark:text-white">
                    {stats.mostViewed?.[0]?.name || 'N/A'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Dashboard Grid */}
        {dashboards.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <LayoutDashboard className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No dashboards yet
            </h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Create your first custom dashboard to visualize your data
            </p>
            <Link href="/dashboards/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Dashboard
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Link key={dashboard.id} href={`/dashboards/${dashboard.id}`}>
                <Card className="group relative cursor-pointer p-4 transition-all hover:border-sky-500 hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500">
                      <LayoutDashboard className="h-6 w-6 text-white" />
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setMenuOpen(
                            menuOpen === dashboard.id ? null : dashboard.id,
                          )
                        }}
                        className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <MoreVertical className="h-4 w-4 text-zinc-500" />
                      </button>
                      {menuOpen === dashboard.id && (
                        <div className="absolute top-8 right-0 z-10 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                          <button
                            onClick={(e) =>
                              handleClone(dashboard.id, dashboard.name, e)
                            }
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <Copy className="h-4 w-4" />
                            Clone
                          </button>
                          <button
                            onClick={(e) => handleDelete(dashboard.id, e)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="mb-1 font-semibold text-zinc-900 dark:text-white">
                    {dashboard.name}
                  </h3>
                  {dashboard.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {dashboard.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
                    <span>{dashboard.widgets.length} widgets</span>
                    <span>
                      {new Date(dashboard.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {dashboard.isDefault && (
                    <span className="absolute top-4 right-4 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                      Default
                    </span>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContent>
    </>
  )
}
