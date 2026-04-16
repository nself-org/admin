'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { useCreateDashboard } from '@/hooks/useDashboards'
import { ArrowLeft, LayoutDashboard, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewDashboardPage() {
  const router = useRouter()
  const { create, isLoading, error } = useCreateDashboard()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState(12)
  const [isPublic, setIsPublic] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    try {
      const dashboard = await create({
        name: name.trim(),
        description: description.trim() || undefined,
        layout: 'grid',
        columns,
        rowHeight: 80,
        widgets: [],
        isPublic,
        createdBy: 'admin', // From current session
      })

      if (dashboard) {
        // Redirect to edit page after creation
        router.push(`/dashboards/${dashboard.id}/edit`)
      }
    } catch (_error) {
      // Error is handled by the hook
    }
  }

  return (
    <>
      <PageHeader
        title="Create Dashboard"
        description="Set up a new custom dashboard"
        breadcrumbs={[
          { label: 'Dashboards', href: '/dashboards' },
          { label: 'New' },
        ]}
      />
      <PageContent>
        <Card className="mx-auto max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dashboard Icon */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500">
                <LayoutDashboard className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Dashboard Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter dashboard name"
                required
                autoFocus
                className="text-lg"
              />
            </div>

            {/* Description Field */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this dashboard is for (optional)"
                rows={3}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-sky-500"
              />
            </div>

            {/* Grid Columns */}
            <div>
              <label
                htmlFor="columns"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Grid Columns
              </label>
              <select
                id="columns"
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:border-sky-500"
              >
                <option value={6}>6 columns (compact)</option>
                <option value={12}>12 columns (standard)</option>
                <option value={24}>24 columns (detailed)</option>
              </select>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                More columns allow for more precise widget placement
              </p>
            </div>

            {/* Visibility */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-sky-500 focus:ring-sky-500 dark:border-zinc-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Make this dashboard public
                </span>
              </label>
              <p className="mt-1 ml-7 text-xs text-zinc-500 dark:text-zinc-400">
                Public dashboards can be viewed by anyone with the link
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
              <Link href="/dashboards">
                <Button type="button" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Dashboard
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Tips */}
        <div className="mx-auto mt-8 max-w-2xl">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Tips for creating great dashboards
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <h4 className="mb-2 font-medium text-zinc-900 dark:text-white">
                Start Simple
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Begin with a few key metrics and expand as needed
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <h4 className="mb-2 font-medium text-zinc-900 dark:text-white">
                Group Related Data
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Place related widgets together for easier scanning
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <h4 className="mb-2 font-medium text-zinc-900 dark:text-white">
                Use Clear Titles
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Give each widget a descriptive name for clarity
              </p>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}
