import { cn } from '@/lib/utils'
import * as React from 'react'

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive' | 'info' | 'warning' | 'success'
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      'relative w-full rounded-lg border p-4',
      {
        'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50': variant === 'default',
        'border-red-500/50 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-100 [&>svg]:text-red-600 dark:[&>svg]:text-red-400':
          variant === 'destructive',
        'border-blue-500/50 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-100 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400':
          variant === 'info',
        'border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400':
          variant === 'warning',
        'border-green-500/50 bg-green-50 text-green-900 dark:border-green-500 dark:bg-green-950 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400':
          variant === 'success',
      },
      className
    )}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 leading-none font-medium tracking-tight', className)}
      {...props}
    />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
