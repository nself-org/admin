import { cn } from '@/lib/utils'
import * as React from 'react'

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
      <div className="h-full w-full overflow-auto rounded-[inherit]">{children}</div>
    </div>
  )
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
