'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { useFormContext } from './form'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'

/**
 * Form field component with label, input, and error message
 * Automatically integrates with Form context for validation
 *
 * @example
 * ```tsx
 * <FormField
 *   name="email"
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   required
 * />
 * ```
 */

export interface FormFieldProps {
  /** Field name (used for validation and data binding) */
  name: string
  /** Field label */
  label?: string
  /** Field type (text, email, password, etc.) */
  type?: string
  /** Help text displayed below input */
  helpText?: string
  /** Use textarea instead of input */
  multiline?: boolean
  /** Number of rows for textarea */
  rows?: number
  /** Placeholder text */
  placeholder?: string
  /** Required field */
  required?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Custom onChange handler */
  onChange?: (value: string) => void
  /** Class name */
  className?: string
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      name,
      label,
      type = 'text',
      helpText,
      multiline = false,
      rows = 4,
      className,
      required,
      placeholder,
      disabled,
      onChange,
    },
    ref
  ) => {
    const { errors, values, isLoading, setFieldValue } = useFormContext()

    const error = errors[name]
    const value = (values[name] as string) || ''

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setFieldValue(name, newValue)
      onChange?.(newValue)
    }

    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <Label htmlFor={name} className="flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        {multiline ? (
          <Textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            disabled={isLoading || disabled}
            rows={rows}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
          />
        ) : (
          <Input
            ref={ref}
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            disabled={isLoading || disabled}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
          />
        )}

        {error && (
          <p id={`${name}-error`} className="text-sm font-medium text-red-500" role="alert">
            {error}
          </p>
        )}

        {helpText && !error && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{helpText}</p>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'
