'use client'

/**
 * ProgressModal component - Modal showing long operation progress with cancel button
 *
 * @example
 * ```tsx
 * <ProgressModal
 *   open={open}
 *   title="Building Project"
 *   description="Setting up your nself project..."
 *   progress={45}
 *   onCancel={() => console.log('cancelled')}
 * />
 * ```
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Progress } from '@/components/ui/progress'
import * as React from 'react'

interface ProgressModalProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  progress?: number
  indeterminate?: boolean
  onCancel?: () => void
  cancelText?: string
  showCancel?: boolean
  logs?: string[]
}

export function ProgressModal({
  open,
  onOpenChange,
  title,
  description,
  progress = 0,
  indeterminate = false,
  onCancel,
  cancelText = 'Cancel',
  showCancel = true,
  logs = [],
}: ProgressModalProps) {
  const handleCancel = React.useCallback(() => {
    onCancel?.()
    onOpenChange?.(false)
  }, [onCancel, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {indeterminate ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-muted-foreground text-right text-sm">{progress}%</p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-muted max-h-48 overflow-y-auto rounded-md border p-4">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="text-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showCancel && onCancel && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {cancelText}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
