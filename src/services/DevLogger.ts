// Development Logger Service - REMOVE FOR PRODUCTION
// Captures all events, clicks, navigation, API calls, errors, and performance metrics

interface LogEntry {
  id: string
  timestamp: string
  type:
    | 'click'
    | 'navigation'
    | 'api'
    | 'error'
    | 'performance'
    | 'state'
    | 'render'
    | 'network'
    | 'user'
  level: 'debug' | 'info' | 'warn' | 'error'
  category: string
  message: string
  data?: any
  stack?: string
  duration?: number
  url?: string
  method?: string
  status?: number
  pathname?: string
  component?: string
}

class DevLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private listeners: Set<(logs: LogEntry[]) => void> = new Set()
  private performanceObserver: PerformanceObserver | null = null
  private originalFetch: typeof fetch | null = null
  private originalConsole: any = {}
  private clickHandler: ((e: MouseEvent) => void) | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private initialize() {
    // Intercept console methods
    this.interceptConsole()

    // Intercept fetch for API tracking
    this.interceptFetch()

    // Track clicks
    this.trackClicks()

    // Track navigation
    this.trackNavigation()

    // Track performance
    this.trackPerformance()

    // Track errors
    this.trackErrors()

    // Log initialization
    this.log('info', 'system', 'DevLogger initialized', {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: new Date().toISOString(),
    })
  }

  private interceptConsole() {
    const methods = ['log', 'info', 'warn', 'error', 'debug']
    methods.forEach((method) => {
      this.originalConsole[method] = console[method as keyof Console]
      ;(console as any)[method] = (...args: any[]) => {
        // Call original console method
        this.originalConsole[method](...args)

        // Log to our system
        const level = method === 'log' ? 'info' : (method as any)
        this.log(
          level,
          'console',
          args
            .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
            .join(' ')
        )
      }
    })
  }

  private interceptFetch() {
    this.originalFetch = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [input, init] = args
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      const method = init?.method || 'GET'
      const startTime = performance.now()

      try {
        const response = await this.originalFetch!(...args)
        const duration = performance.now() - startTime

        this.log('info', 'api', `${method} ${url}`, {
          url,
          method,
          status: response.status,
          duration: Math.round(duration),
          ok: response.ok,
          type: response.type,
        })

        return response
      } catch (error) {
        const duration = performance.now() - startTime
        this.log('error', 'api', `${method} ${url} failed`, {
          url,
          method,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  }

  private trackClicks() {
    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const _tagName = target.tagName
      const _id = target.id
      const _className = target.className
      const _text = target.textContent?.substring(0, 50)
      const _href = (target as HTMLAnchorElement).href

      // Find closest button or link
      const button = target.closest('button')
      const link = target.closest('a')
      const interactive = button || link || target

      this.log('info', 'click', `Clicked ${interactive.tagName}`, {
        tagName: interactive.tagName,
        id: interactive.id,
        className: typeof interactive.className === 'string' ? interactive.className : '',
        text: interactive.textContent?.substring(0, 50),
        href: (interactive as HTMLAnchorElement).href,
        coordinates: { x: e.clientX, y: e.clientY },
        path: this.getElementPath(target),
      })
    }

    document.addEventListener('click', this.clickHandler, true)
  }

  private trackNavigation() {
    // Track route changes
    if (typeof window !== 'undefined') {
      const originalPushState = history.pushState
      const originalReplaceState = history.replaceState

      history.pushState = (...args) => {
        this.log('info', 'navigation', `Navigation: ${args[2]}`, {
          type: 'pushState',
          url: args[2],
          from: window.location.pathname,
          to: args[2],
        })
        return originalPushState.apply(history, args)
      }

      history.replaceState = (...args) => {
        this.log('info', 'navigation', `Replace: ${args[2]}`, {
          type: 'replaceState',
          url: args[2],
          from: window.location.pathname,
          to: args[2],
        })
        return originalReplaceState.apply(history, args)
      }

      window.addEventListener('popstate', () => {
        this.log('info', 'navigation', `Back/Forward: ${window.location.pathname}`, {
          type: 'popstate',
          url: window.location.pathname,
        })
      })
    }
  }

  private trackPerformance() {
    if ('PerformanceObserver' in window) {
      // Track long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // Tasks longer than 50ms
              this.log('warn', 'performance', `Long task: ${Math.round(entry.duration)}ms`, {
                duration: Math.round(entry.duration),
                startTime: Math.round(entry.startTime),
                name: entry.name,
              })
            }
          }
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch {
        // Intentionally empty - some browsers don't support longtask
      }

      // Track navigation timing
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const nav = entry as PerformanceNavigationTiming
            this.log('info', 'performance', 'Page load metrics', {
              domContentLoaded: Math.round(
                nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart
              ),
              loadComplete: Math.round(nav.loadEventEnd - nav.loadEventStart),
              domInteractive: Math.round(nav.domInteractive),
              timeToFirstByte: Math.round(nav.responseStart - nav.requestStart),
            })
          }
        })
        navObserver.observe({ entryTypes: ['navigation'] })
      } catch {
        // Intentionally empty - fallback
      }
    }
  }

  private trackErrors() {
    window.addEventListener('error', (e) => {
      this.log('error', 'error', e.message, {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
      })
    })

    window.addEventListener('unhandledrejection', (e) => {
      this.log('error', 'error', `Unhandled Promise: ${e.reason}`, {
        reason: e.reason,
        promise: String(e.promise),
        stack: e.reason?.stack,
      })
    })
  }

  private getElementPath(element: HTMLElement): string {
    const path: string[] = []
    let current: HTMLElement | null = element

    while (current && current !== document.body) {
      const tag = current.tagName.toLowerCase()
      const id = current.id ? `#${current.id}` : ''
      const className = current.className ? `.${current.className.split(' ')[0]}` : ''
      path.unshift(`${tag}${id}${className}`)
      current = current.parentElement
    }

    return path.join(' > ')
  }

  log(level: LogEntry['level'], category: string, message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: this.getTypeFromCategory(category),
      level,
      category,
      message,
      data,
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    }

    // Add to logs
    this.logs.unshift(entry)

    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('devLogs', JSON.stringify(this.logs.slice(0, 100)))
    } catch {
      // Intentionally empty - localStorage might be full
    }

    // Notify listeners
    this.notifyListeners()
  }

  private getTypeFromCategory(category: string): LogEntry['type'] {
    const typeMap: Record<string, LogEntry['type']> = {
      click: 'click',
      navigation: 'navigation',
      api: 'api',
      error: 'error',
      performance: 'performance',
      console: 'user',
      render: 'render',
      network: 'network',
      state: 'state',
    }
    return typeMap[category] || 'user'
  }

  getLogs(): LogEntry[] {
    return this.logs
  }

  clearLogs() {
    this.logs = []
    localStorage.removeItem('devLogs')
    this.notifyListeners()
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.logs))
  }

  // Track component renders
  trackRender(componentName: string, props?: any) {
    this.log('debug', 'render', `Rendered ${componentName}`, {
      component: componentName,
      props: props ? Object.keys(props) : undefined,
    })
  }

  // Track state changes
  trackState(storeName: string, action: string, data?: any) {
    this.log('debug', 'state', `${storeName}: ${action}`, {
      store: storeName,
      action,
      data,
    })
  }

  // Manual performance marking
  startTimer(name: string) {
    performance.mark(`${name}-start`)
  }

  endTimer(name: string) {
    performance.mark(`${name}-end`)
    try {
      performance.measure(name, `${name}-start`, `${name}-end`)
      const measure = performance.getEntriesByName(name)[0]
      if (!measure) return
      this.log('info', 'performance', `Timer ${name}: ${Math.round(measure.duration)}ms`, {
        name,
        duration: Math.round(measure.duration),
      })
    } catch {
      // Intentionally empty - timing mark might not exist
    }
  }

  // Get summary stats
  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      errors: this.logs.filter((l) => l.level === 'error').length,
      apiCalls: this.logs.filter((l) => l.type === 'api').length,
      clicks: this.logs.filter((l) => l.type === 'click').length,
      navigations: this.logs.filter((l) => l.type === 'navigation').length,
      avgApiDuration: 0,
    }

    // Count by type and level
    this.logs.forEach((log) => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1
    })

    // Calculate average API duration
    const apiLogs = this.logs.filter((l) => l.type === 'api' && l.data?.duration)
    if (apiLogs.length > 0) {
      stats.avgApiDuration =
        apiLogs.reduce((sum, log) => sum + (log.data?.duration || 0), 0) / apiLogs.length
    }

    return stats
  }

  // Export logs
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `devlogs-${new Date().toISOString()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Cleanup
  destroy() {
    // Restore console
    Object.keys(this.originalConsole).forEach((method) => {
      console[method as keyof Console] = this.originalConsole[method]
    })

    // Restore fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch
    }

    // Remove click handler
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true)
    }

    // Clear listeners
    this.listeners.clear()
  }
}

// Singleton instance
export const devLogger = new DevLogger()

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  ;(window as any).devLogger = devLogger
}
