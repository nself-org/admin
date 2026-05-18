// DEV ONLY - REMOVE FOR PRODUCTION
// Hook to track component renders and performance

import { useEffect, useRef } from 'react'

export function useDevTracking(componentName: string, props?: any) {
  const renderCount = useRef(0)
  const renderStart = useRef(0)

  // Track mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).devLogger) {
      const devLogger = (window as any).devLogger
      devLogger.log('debug', 'render', `${componentName} mounted`, {
        component: componentName,
        props: props ? Object.keys(props) : undefined,
      })
    }

    // Capture the ref at effect setup time to avoid stale closure warning
    const renderCountRef = renderCount
    return () => {
      const totalRenders = renderCountRef.current
      if (typeof window !== 'undefined' && (window as any).devLogger) {
        const devLogger = (window as any).devLogger
        devLogger.log('debug', 'render', `${componentName} unmounted`, {
          component: componentName,
          totalRenders: totalRenders,
        })
      }
    }
  }, [componentName, props])

  // Track renders
  useEffect(() => {
    renderCount.current++

    if (renderCount.current > 1 && typeof window !== 'undefined' && (window as any).devLogger) {
      const devLogger = (window as any).devLogger
      const renderTime = performance.now() - renderStart.current

      devLogger.log('debug', 'render', `${componentName} re-rendered`, {
        component: componentName,
        renderCount: renderCount.current,
        renderTime: Math.round(renderTime * 100) / 100,
        props: props ? Object.keys(props) : undefined,
      })
    }

    renderStart.current = performance.now()
  })

  return {
    logEvent: (event: string, data?: any) => {
      if (typeof window !== 'undefined' && (window as any).devLogger) {
        const devLogger = (window as any).devLogger
        devLogger.log('info', 'component', `${componentName}: ${event}`, {
          component: componentName,
          event,
          ...data,
        })
      }
    },
    startTimer: (name: string) => {
      if (typeof window !== 'undefined' && (window as any).devLogger) {
        const devLogger = (window as any).devLogger
        devLogger.startTimer(`${componentName}-${name}`)
      }
    },
    endTimer: (name: string) => {
      if (typeof window !== 'undefined' && (window as any).devLogger) {
        const devLogger = (window as any).devLogger
        devLogger.endTimer(`${componentName}-${name}`)
      }
    },
  }
}
