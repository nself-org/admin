'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReportTemplate } from '@/types/report'
import {
  BarChart3,
  Calendar,
  Clock,
  FileSpreadsheet,
  LayoutList,
  PieChart,
  Table,
} from 'lucide-react'

interface ReportTemplateCardProps {
  template: ReportTemplate
  onClick?: () => void
  selected?: boolean
}

export function ReportTemplateCard({ template, onClick, selected }: ReportTemplateCardProps) {
  const getVisualizationIcon = () => {
    if (!template.visualization) return <Table className="h-5 w-5" />

    switch (template.visualization.type) {
      case 'chart':
        switch (template.visualization.chartType) {
          case 'bar':
            return <BarChart3 className="h-5 w-5" />
          case 'pie':
            return <PieChart className="h-5 w-5" />
          case 'line':
            return <LayoutList className="h-5 w-5" />
          default:
            return <BarChart3 className="h-5 w-5" />
        }
      case 'summary':
        return <FileSpreadsheet className="h-5 w-5" />
      case 'table':
      default:
        return <Table className="h-5 w-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-emerald-500/50 hover:shadow-md ${
        selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-zinc-700/50'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50 text-zinc-300">
              {getVisualizationIcon()}
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {template.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {template.description && (
          <CardDescription className="mb-4 line-clamp-2">{template.description}</CardDescription>
        )}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <LayoutList className="h-3.5 w-3.5" />
            <span>{template.columns.length} columns</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(template.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDate(template.updatedAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
