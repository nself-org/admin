'use client'

import { ActivityFeed, ActivityTimeline } from '@/components/activity'
import { ListSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActivityStats } from '@/hooks/useActivity'
import { Activity, BarChart3, Calendar, CalendarDays, Download } from 'lucide-react'
import * as React from 'react'
import { Suspense, useState } from 'react'

function StatsCard({
  title,
  value,
  icon: Icon,
  isLoading,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityPageContent() {
  const [view, setView] = useState<'feed' | 'timeline'>('feed')
  const { totalToday, totalWeek, totalMonth, isLoading: statsLoading } = useActivityStats()

  const handleExport = async () => {
    try {
      const response = await fetch('/api/activity/export')
      const json = await response.json()

      if (json.success && json.data) {
        const blob = new Blob([JSON.stringify(json.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `activity-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (_error) {
      // Silent error handling
    }
  }

  return (
    <>
      <PageHeader
        title="Activity"
        description="Track all activity across your project"
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />
      <PageContent>
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatsCard title="Today" value={totalToday} icon={Activity} isLoading={statsLoading} />
          <StatsCard title="This Week" value={totalWeek} icon={Calendar} isLoading={statsLoading} />
          <StatsCard
            title="This Month"
            value={totalMonth}
            icon={CalendarDays}
            isLoading={statsLoading}
          />
        </div>

        {/* Tabs for Feed and Timeline */}
        <Card className="p-6">
          <Tabs value={view} onValueChange={(v) => setView(v as 'feed' | 'timeline')}>
            <TabsList className="mb-4">
              <TabsTrigger value="feed">
                <Activity className="mr-2 h-4 w-4" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>
            <TabsContent value="feed">
              <ActivityFeed showFilter limit={20} />
            </TabsContent>
            <TabsContent value="timeline">
              <ActivityTimeline groupByDate limit={20} />
            </TabsContent>
          </Tabs>
        </Card>
      </PageContent>
    </>
  )
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ActivityPageContent />
    </Suspense>
  )
}
