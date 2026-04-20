/**
 * Error logging service for nself-admin
 * Handles sending errors to logging backends with rate limiting
 * Supports multiple backends: console, API endpoint, and future integrations (Sentry, etc.)
 */

import { logger } from './logger'

interface ErrorReport {
  message: string
  stack?: string | null
  componentStack?: string | null
  timestamp: string
  userAgent?: string
  url?: string
}

class ErrorLoggingService {
  private errorCounts = new Map<string, number>()
  private errorTimestamps = new Map<string, number[]>()
  private readonly MAX_ERRORS_PER_MINUTE = 10
  private readonly RATE_LIMIT_WINDOW = 60000 // 1 minute in ms

  /**
   * Check if error logging is enabled
   */
  private isLoggingEnabled(): boolean {
    const isProduction = process.env.NODE_ENV === 'production'
    return isProduction || process.env.ENABLE_ERROR_LOGGING === 'true'
  }

  /**
   * Get a fingerprint for the error to identify similar errors
   */
  private getErrorFingerprint(message: string, stack?: string): string {
    const stackFirstLine = stack?.split('\n')[0] || 'no-stack'
    return `${message}:${stackFirstLine}`
  }

  /**
   * Check if we should report this error (rate limiting)
   */
  private shouldReportError(fingerprint: string): boolean {
    const now = Date.now()
    const timestamps = this.errorTimestamps.get(fingerprint) || []

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(
      (t) => now - t < this.RATE_LIMIT_WINDOW,
    )

    if (recentTimestamps.length >= this.MAX_ERRORS_PER_MINUTE) {
      return false
    }

    // Update timestamps
    recentTimestamps.push(now)
    this.errorTimestamps.set(fingerprint, recentTimestamps)

    return true
  }

  /**
   * Create a serializable error report
   */
  private createErrorReport(
    error: Error,
    errorInfo?: React.ErrorInfo,
  ): ErrorReport {
    return {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }
  }

  /**
   * Log error to console (always in dev, conditionally in prod)
   */
  private logToConsole(
    error: Error,
    errorInfo?: React.ErrorInfo,
    reported = false,
  ): void {
    if (!this.isLoggingEnabled()) {
      return
    }

    const prefix = reported ? '[Reported]' : '[Local Only]'
    logger.error(`${prefix} Uncaught error: ${error.message}`, {
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    })
  }

  /**
   * Send error to logging API endpoint
   */
  private async sendToApiEndpoint(report: ErrorReport): Promise<boolean> {
    try {
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })

      if (!response.ok) {
        logger.warn('Error reporting failed', { status: response.status })
        return false
      }

      return true
    } catch (err) {
      // Silently fail - don't break app if logging fails
      logger.warn('Failed to send error to API', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Send error to Sentry when SENTRY_DSN is configured.
   * Sentry SDK is loaded lazily so it has zero import side-effects when DSN is absent.
   * If Sentry init itself throws (e.g. bad DSN format), the error is caught and logged
   * to console only — never re-thrown.
   */
  private async sendToExternalService(report: ErrorReport): Promise<boolean> {
    if (!process.env.SENTRY_DSN) {
      return false
    }

    try {
      // Lazy import — Sentry SDK is not bundled when DSN is absent.
      const Sentry = await import('@sentry/nextjs')

      // Init is idempotent in @sentry/nextjs — safe to call on every error.
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        // Only report errors, not transactions, to keep usage low.
        tracesSampleRate: 0,
      })

      Sentry.captureException(new Error(report.message), {
        extra: {
          stack: report.stack,
          componentStack: report.componentStack,
          url: report.url,
          userAgent: report.userAgent,
          timestamp: report.timestamp,
        },
      })

      return true
    } catch (err) {
      // Sentry init/capture failure must never surface to the user.
      logger.warn('Sentry error capture failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Report an error to logging service
   * Called from error boundaries and error handlers
   */
  async reportError(error: Error, errorInfo?: React.ErrorInfo): Promise<void> {
    // Always log to console first
    this.logToConsole(error, errorInfo, false)

    // In development or if logging is disabled, don't report to external service
    if (!this.isLoggingEnabled()) {
      return
    }

    try {
      const fingerprint = this.getErrorFingerprint(error.message, error.stack)

      // Check rate limit
      if (!this.shouldReportError(fingerprint)) {
        logger.debug('Error rate limit reached, not reporting', { fingerprint })
        return
      }

      // Create error report
      const report = this.createErrorReport(error, errorInfo)

      // Try to send to API endpoint first
      const sent = await this.sendToApiEndpoint(report)

      if (sent) {
        this.logToConsole(error, errorInfo, true)
      } else {
        // Try external service as fallback
        await this.sendToExternalService(report)
      }
    } catch (reportError) {
      // Never throw from error logging - just log the failure
      logger.warn('Error in error reporting system', {
        error: reportError instanceof Error ? reportError.message : 'Unknown',
      })
    }
  }

  /**
   * Clear rate limit cache (useful for testing)
   */
  clearRateLimitCache(): void {
    this.errorTimestamps.clear()
    this.errorCounts.clear()
  }

  /**
   * Get current rate limit stats
   */
  getStats(): { totalTracked: number; openLimitedErrors: number } {
    let openLimited = 0
    const now = Date.now()

    for (const timestamps of this.errorTimestamps.values()) {
      const recent = timestamps.filter((t) => now - t < this.RATE_LIMIT_WINDOW)
      if (recent.length >= this.MAX_ERRORS_PER_MINUTE) {
        openLimited++
      }
    }

    return {
      totalTracked: this.errorTimestamps.size,
      openLimitedErrors: openLimited,
    }
  }
}

// Export singleton instance
export const errorLogging = new ErrorLoggingService()

/**
 * Main export function for error boundary
 * Usage: reportError(error, errorInfo)
 */
export async function reportError(
  error: Error,
  errorInfo?: React.ErrorInfo,
): Promise<void> {
  return errorLogging.reportError(error, errorInfo)
}
