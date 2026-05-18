import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartSkeletonProps {
  title?: boolean
  height?: 'sm' | 'md' | 'lg'
}

export function ChartSkeleton({ title = true, height = 'md' }: ChartSkeletonProps) {
  const heights = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-96',
  }

  return (
    <Card aria-label="Loading chart...">
      {title && (
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </CardHeader>
      )}
      <CardContent>
        <div className={`flex items-end justify-between gap-2 ${heights[height]}`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{
                height: `${Math.random() * 60 + 40}%`,
              }}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-12" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
