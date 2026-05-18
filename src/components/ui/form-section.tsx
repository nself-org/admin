'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { Separator } from './separator'

/**
 * Form section component for grouping related fields
 *
 * @example
 * ```tsx
 * <Form>
 *   <FormSection title="Personal Information" description="Your basic details">
 *     <FormField name="firstName" label="First Name" />
 *     <FormField name="lastName" label="Last Name" />
 *   </FormSection>
 *
 *   <FormSection title="Contact" description="How we reach you">
 *     <FormField name="email" label="Email" type="email" />
 *     <FormField name="phone" label="Phone" type="tel" />
 *   </FormSection>
 * </Form>
 * ```
 */

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Show separator before section (default: true for sections after the first) */
  showSeparator?: boolean
}

export function FormSection({
  title,
  description,
  showSeparator,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <>
      {showSeparator && <Separator className="my-8" />}
      <div className={cn('space-y-6', className)} {...props}>
        {(title || description) && (
          <div className="space-y-2">
            {title && (
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
        )}
        <div className="space-y-4">{children}</div>
      </div>
    </>
  )
}
