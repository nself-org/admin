'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  threshold?: number
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const y = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const opacity = useTransform(y, [0, threshold], [0, 1])
  const rotate = useTransform(y, [0, threshold], [0, 360])
  const scale = useTransform(y, [0, threshold], [0.5, 1])

  useEffect(() => {
    if (disabled) return

    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0]?.clientY ?? 0
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return

      currentY.current = e.touches[0]?.clientY ?? 0
      const diff = currentY.current - startY.current

      if (diff > 0 && diff < threshold * 2) {
        e.preventDefault()
        y.set(Math.min(diff, threshold * 1.5))
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling) return

      setIsPulling(false)
      const pullDistance = y.get()

      if (pullDistance >= threshold) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          y.set(0)
        }
      } else {
        y.set(0)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, isPulling, isRefreshing, onRefresh, threshold, y])

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <motion.div
        className="pointer-events-none fixed top-16 right-0 left-0 z-50 flex justify-center"
        style={{ opacity }}
      >
        <div className="rounded-full bg-white p-3 shadow-lg dark:bg-zinc-900">
          <motion.div style={{ rotate, scale }}>
            <RefreshCw
              className={`h-6 w-6 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
