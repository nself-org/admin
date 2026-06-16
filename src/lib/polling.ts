/**
 * Centralized polling service manager to prevent memory leaks
 */

type PollingCallback = () => void | Promise<void>

interface PollingTask {
  id: string
  callback: PollingCallback
  interval: number
  timer?: NodeJS.Timeout
}

class PollingManager {
  private tasks = new Map<string, PollingTask>()
  private abortControllers = new Map<string, AbortController>()

  /**
   * Register a polling task
   */
  register(
    id: string,
    callback: PollingCallback,
    interval: number,
    immediate: boolean = true
  ): void {
    // Clean up existing task if any
    this.unregister(id)

    // Create abort controller for this task
    const abortController = new AbortController()
    this.abortControllers.set(id, abortController)

    // Wrapped callback with error handling
    const wrappedCallback = async () => {
      if (abortController.signal.aborted) return

      try {
        await callback()
      } catch (error) {
        console.warn(`[PollingManager] Error in polling task ${id}:`, error)
      }
    }

    // Execute immediately if requested
    if (immediate) {
      wrappedCallback()
    }

    // Set up interval
    const timer = setInterval(wrappedCallback, interval)

    this.tasks.set(id, {
      id,
      callback: wrappedCallback,
      interval,
      timer,
    })
  }

  /**
   * Unregister a polling task
   */
  unregister(id: string): void {
    const task = this.tasks.get(id)
    if (task?.timer) {
      clearInterval(task.timer)
    }

    const abortController = this.abortControllers.get(id)
    if (abortController) {
      abortController.abort()
      this.abortControllers.delete(id)
    }

    this.tasks.delete(id)
  }

  /**
   * Pause a polling task
   */
  pause(id: string): void {
    const task = this.tasks.get(id)
    if (task?.timer) {
      clearInterval(task.timer)
      task.timer = undefined
    }
  }

  /**
   * Resume a paused polling task
   */
  resume(id: string): void {
    const task = this.tasks.get(id)
    if (task && !task.timer) {
      task.timer = setInterval(task.callback, task.interval)
    }
  }

  /**
   * Update polling interval
   */
  updateInterval(id: string, newInterval: number): void {
    const task = this.tasks.get(id)
    if (task) {
      this.register(id, task.callback, newInterval, false)
    }
  }

  /**
   * Clean up all polling tasks
   */
  cleanup(): void {
    this.tasks.forEach((task) => {
      if (task.timer) {
        clearInterval(task.timer)
      }
    })

    this.abortControllers.forEach((controller) => {
      controller.abort()
    })

    this.tasks.clear()
    this.abortControllers.clear()
  }

  /**
   * Get active task IDs
   */
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys())
  }
}

// Singleton instance
export const pollingManager = new PollingManager()

// React hook for polling
import { useEffect, useRef } from 'react'

export function usePolling(
  callback: PollingCallback,
  interval: number | null,
  deps: any[] = []
): void {
  const savedCallback = useRef<PollingCallback | undefined>(undefined)
  const taskId = useRef<string | undefined>(undefined)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the polling
  useEffect(() => {
    if (interval !== null && interval > 0) {
      // Generate unique task ID
      taskId.current = `polling-${Math.random().toString(36).substr(2, 9)}`

      // Register polling task
      pollingManager.register(taskId.current, () => savedCallback.current?.(), interval, true)

      // Cleanup on unmount
      return () => {
        if (taskId.current) {
          pollingManager.unregister(taskId.current)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- spread deps array is intentional (polling hook API design); ESLint cannot statically verify spread deps
  }, [interval, ...deps])
}

// Ensure cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pollingManager.cleanup()
  })
}
