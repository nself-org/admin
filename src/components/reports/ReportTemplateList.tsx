'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useReportTemplates } from '@/hooks/useReports'
import { FileText, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ReportTemplateCard } from './ReportTemplateCard'

interface ReportTemplateListProps {
  category?: string
  onSelect?: (templateId: string) => void
  selectedId?: string
}

export function ReportTemplateList({ category, onSelect, selectedId }: ReportTemplateListProps) {
  const { templates, isLoading } = useReportTemplates(category)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates

    const query = searchQuery.toLowerCase()
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    )
  }, [templates, searchQuery])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <ReportTemplateCard
              key={template.id}
              template={template}
              selected={selectedId === template.id}
              onClick={() => onSelect?.(template.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <FileText className="mb-4 h-12 w-12 text-zinc-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            {searchQuery ? 'No templates found' : 'No report templates yet'}
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first report template to get started'}
          </p>
          {!searchQuery && (
            <Link
              href="/reports/templates/create"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" /> Create Template
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
