'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { Button } from './button'
import { useFormContext } from './form'

/**
 * Form actions component with submit and cancel buttons
 * Automatically integrates with Form context for loading state
 *
 * @example
 * ```tsx
 * <Form onSubmit={handleSubmit}>
 *   <FormField name="name" label="Name" />
 *   <FormActions
 *     submitText="Save Changes"
 *     cancelText="Cancel"
 *     onCancel={() => router.back()}
 *   />
 * </Form>
 * ```
 */

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Submit button text (default: "Submit") */
  submitText?: string
  /** Cancel button text (default: "Cancel") */
  cancelText?: string
  /** Show cancel button (default: true) */
  showCancel?: boolean
  /** Cancel handler */
  onCancel?: () => void
  /** Submit button variant */
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary'
  /** Align buttons (default: "end") */
  align?: 'start' | 'center' | 'end' | 'between'
}

export function FormActions({
  submitText = 'Submit',
  cancelText = 'Cancel',
  showCancel = true,
  onCancel,
  submitVariant = 'default',
  align = 'end',
  className,
  ...props
}: FormActionsProps) {
  const { isLoading } = useFormContext()

  const alignClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[align]

  return (
    <div className={cn('flex items-center gap-3 pt-4', alignClass, className)} {...props}>
      {showCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
      )}
      <Button type="submit" variant={submitVariant} disabled={isLoading}>
        {isLoading ? 'Submitting...' : submitText}
      </Button>
    </div>
  )
}
