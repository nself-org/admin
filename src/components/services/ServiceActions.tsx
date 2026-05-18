'use client'

import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container, ExternalLink, FileText, Trash2 } from 'lucide-react'

interface ServiceActionsProps {
  serviceName: string
  webUIUrl?: string
  dockerContainer?: string
  onAccessUI?: () => void
  onViewDocker?: () => void
  onViewCompose?: () => void
  onRemoveService?: () => void
}

export function ServiceActions({
  serviceName,
  webUIUrl,
  dockerContainer,
  onAccessUI,
  onViewDocker,
  onViewCompose,
  onRemoveService,
}: ServiceActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{serviceName} Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {webUIUrl && onAccessUI && (
          <Button onClick={onAccessUI} variant="outline" className="w-full justify-start">
            <ExternalLink className="mr-2 h-4 w-4" />
            Access Web UI
            <span className="ml-auto font-mono text-xs text-zinc-500">{webUIUrl}</span>
          </Button>
        )}

        {dockerContainer && onViewDocker && (
          <Button onClick={onViewDocker} variant="outline" className="w-full justify-start">
            <Container className="mr-2 h-4 w-4" />
            View in Docker
            <span className="ml-auto font-mono text-xs text-zinc-500">{dockerContainer}</span>
          </Button>
        )}

        {onViewCompose && (
          <Button onClick={onViewCompose} variant="outline" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" />
            View Compose Config
          </Button>
        )}

        {onRemoveService && (
          <Button
            onClick={onRemoveService}
            variant="outline"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Service
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
