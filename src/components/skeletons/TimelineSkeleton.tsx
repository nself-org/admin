import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface TimelineSkeletonProps {
  items?: number
}

export function TimelineSkeleton({ items = 6 }: TimelineSkeletonProps) {
  return (
    <div className="space-y-4" aria-label="Loading timeline...">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < items - 1 && <div className="my-2 w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-800" />}
          </div>
          {/* Timeline content */}
          <Card className="flex-1">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
