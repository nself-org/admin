'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { z } from 'zod'

/**
 * Form wrapper component with built-in validation using Zod schemas
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * })
 *
 * <Form
 *   schema={schema}
 *   onSubmit={(data) => console.log(data)}
 *   onError={(errors) => console.error(errors)}
 * >
 *   <FormField name="email" label="Email" />
 *   <FormField name="password" label="Password" type="password" />
 *   <FormActions />
 * </Form>
 * ```
 */

export interface FormProps<T extends z.ZodType> extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'onError'
> {
  /** Zod schema for validation */
  schema?: T
  /** Submit handler receives validated data */
  onSubmit?: (data: z.infer<T>) => void | Promise<void>
  /** Error handler receives validation errors */
  onError?: (errors: Record<string, string>) => void
  /** Initial form values */
  defaultValues?: Partial<z.infer<T>>
  /** Loading state */
  isLoading?: boolean
}

interface FormContextValue {
  errors: Record<string, string>
  values: Record<string, unknown>
  isLoading: boolean
  setFieldValue: (name: string, value: unknown) => void
  setFieldError: (name: string, error: string) => void
}

const FormContext = React.createContext<FormContextValue | null>(null)

export function useFormContext() {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form component')
  }
  return context
}

export function Form<T extends z.ZodType>({
  schema,
  onSubmit,
  onError,
  defaultValues = {},
  isLoading = false,
  className,
  children,
  ...props
}: FormProps<T>) {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [values, setValues] = React.useState<Record<string, unknown>>(
    defaultValues as Record<string, unknown>,
  )

  const setFieldValue = React.useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear error when field is updated
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const setFieldError = React.useCallback((name: string, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }))
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Clear previous errors
    setErrors({})

    // Validate with schema if provided
    if (schema) {
      try {
        const validatedData = schema.parse(values)
        await onSubmit?.(validatedData)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formattedErrors: Record<string, string> = {}
          error.issues.forEach((err) => {
            const path = err.path.join('.')
            formattedErrors[path] = err.message
          })
          setErrors(formattedErrors)
          onError?.(formattedErrors)
        }
      }
    } else {
      // No validation, just submit
      await onSubmit?.(values as z.infer<T>)
    }
  }

  const contextValue = React.useMemo(
    () => ({
      errors,
      values,
      isLoading,
      setFieldValue,
      setFieldError,
    }),
    [errors, values, isLoading, setFieldValue, setFieldError],
  )

  return (
    <FormContext.Provider value={contextValue}>
      <form
        className={cn('space-y-6', className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}
