'use client'

import { DashboardGrid, WidgetLibrary } from '@/components/dashboards'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import {
  useAddWidget,
  useDashboard,
  useRemoveWidget,
  useUpdateDashboard,
  useUpdateWidget,
} from '@/hooks/useDashboards'
import type { Widget, WidgetPosition, WidgetTemplate } from '@/types/dashboard'
import {
  ArrowLeft,
  Eye,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Settings,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'

export default function EditDashboardPage() {
  const params = useParams()
  const dashboardId = params.id as string

  const { dashboard, isLoading, refresh } = useDashboard(dashboardId)
  const { update: updateDashboard, isLoading: isSaving } = useUpdateDashboard()
  const { add: addWidget } = useAddWidget()
  const { update: updateWidget } = useUpdateWidget()
  const { remove: removeWidget } = useRemoveWidget()

  const [showLibrary, setShowLibrary] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Local state for dashboard settings
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Initialize local state when dashboard loads
  useState(() => {
    if (dashboard) {
      setName(dashboard.name)
      setDescription(dashboard.description || '')
    }
  })

  const handleWidgetUpdate = useCallback(
    async (widgetId: string, position: WidgetPosition) => {
      if (!dashboard) return
      try {
        await updateWidget(dashboardId, widgetId, { position })
        refresh()
        setHasChanges(true)
      } catch (_error) {
        // Handle error silently
      }
    },
    [dashboard, dashboardId, updateWidget, refresh],
  )

  const handleWidgetRemove = useCallback(
    async (widgetId: string) => {
      if (!dashboard) return
      if (confirm('Are you sure you want to remove this widget?')) {
        try {
          await removeWidget(dashboardId, widgetId)
          refresh()
          setHasChanges(true)
        } catch (_error) {
          // Handle error silently
        }
      }
    },
    [dashboard, dashboardId, removeWidget, refresh],
  )

  const handleWidgetEdit = useCallback((widget: Widget) => {
    setEditingWidget(widget)
  }, [])

  const handleAddWidget = useCallback(
    async (template: WidgetTemplate) => {
      if (!dashboard) return

      // Find the next available position
      const maxY = Math.max(
        0,
        ...dashboard.widgets.map((w) => w.position.y + w.position.h),
      )

      const newWidget: Omit<Widget, 'id'> = {
        type: template.type,
        position: {
          x: 0,
          y: maxY,
          w: template.defaultSize.w,
          h: template.defaultSize.h,
        },
        config: {
          title: template.name,
          ...template.defaultConfig,
          dataSource: template.defaultConfig.dataSource || { type: 'static' },
        },
      }

      try {
        await addWidget(dashboardId, newWidget)
        refresh()
        setHasChanges(true)
        setShowLibrary(false)
      } catch (_error) {
        // Handle error silently
      }
    },
    [dashboard, dashboardId, addWidget, refresh],
  )

  const handleSaveSettings = async () => {
    if (!dashboard) return
    try {
      await updateDashboard(dashboardId, { name, description })
      refresh()
      setShowSettings(false)
      setHasChanges(false)
    } catch (_error) {
      // Handle error silently
    }
  }

  const handleSaveWidgetConfig = async () => {
    if (!editingWidget) return
    try {
      await updateWidget(dashboardId, editingWidget.id, {
        config: editingWidget.config,
      })
      refresh()
      setEditingWidget(null)
      setHasChanges(true)
    } catch (_error) {
      // Handle error silently
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
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <PageHeader
            title={`Edit: ${dashboard.name}`}
            description="Drag widgets to reposition, click to edit"
            breadcrumbs={[
              { label: 'Dashboards', href: '/dashboards' },
              { label: dashboard.name, href: `/dashboards/${dashboardId}` },
              { label: 'Edit' },
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLibrary(!showLibrary)}
                >
                  {showLibrary ? (
                    <PanelRightClose className="mr-2 h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="mr-2 h-4 w-4" />
                  )}
                  {showLibrary ? 'Hide' : 'Add'} Widgets
                </Button>
                <Link href={`/dashboards/${dashboardId}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </Link>
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            }
          />
          <PageContent>
            {/* Edit Toolbar */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLibrary(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Widget
              </Button>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {dashboard.widgets.length} widget
                {dashboard.widgets.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Dashboard Grid - Editable */}
            <DashboardGrid
              dashboard={dashboard}
              editable={true}
              onWidgetUpdate={handleWidgetUpdate}
              onWidgetRemove={handleWidgetRemove}
              onWidgetEdit={handleWidgetEdit}
            />
          </PageContent>
        </div>
      </div>

      {/* Widget Library Sidebar */}
      {showLibrary && (
        <div className="w-80 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <WidgetLibrary
            onSelect={handleAddWidget}
            onClose={() => setShowLibrary(false)}
          />
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Dashboard Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name
                </label>
                <Input
                  value={name || dashboard.name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setHasChanges(true)
                  }}
                  placeholder="Dashboard name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <Input
                  value={description || dashboard.description || ''}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setHasChanges(true)
                  }}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Widget Edit Modal */}
      {editingWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Edit Widget
              </h2>
              <button
                onClick={() => setEditingWidget(null)}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Title
                </label>
                <Input
                  value={editingWidget.config.title || ''}
                  onChange={(e) =>
                    setEditingWidget({
                      ...editingWidget,
                      config: {
                        ...editingWidget.config,
                        title: e.target.value,
                      },
                    })
                  }
                  placeholder="Widget title"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Subtitle
                </label>
                <Input
                  value={editingWidget.config.subtitle || ''}
                  onChange={(e) =>
                    setEditingWidget({
                      ...editingWidget,
                      config: {
                        ...editingWidget.config,
                        subtitle: e.target.value,
                      },
                    })
                  }
                  placeholder="Optional subtitle"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingWidget(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveWidgetConfig}>Save Widget</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
