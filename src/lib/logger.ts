/**
 * Structured logging utility for nself-admin
 * Replaces console.log with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private isTest = process.env.NODE_ENV === 'test'

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString()
    const prefix = {
      debug: '\x1b[36m[DEBUG]\x1b[0m',
      info: '\x1b[32m[INFO]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
    }[level]

    if (this.isDev) {
      const contextStr = context ? ` ${JSON.stringify(context)}` : ''
      return `${prefix} [${timestamp}] ${message}${contextStr}`
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp,
      context,
    }
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (this.isTest) return

    const formatted = this.formatMessage(level, message, context)

    switch (level) {
      case 'error':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      default:
        console.log(formatted)
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDev) {
      this.log('debug', message, context)
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context)
  }

  /**
   * Log an API request
   */
  api(method: string, path: string, status?: number, duration?: number) {
    this.info(`${method} ${path}`, {
      method,
      path,
      status,
      duration: duration ? `${duration}ms` : undefined,
    })
  }

  /**
   * Log a CLI command execution
   */
  cli(command: string, success: boolean, duration?: number) {
    const level = success ? 'info' : 'error'
    this.log(level, `CLI: ${command}`, {
      success,
      duration: duration ? `${duration}ms` : undefined,
    })
  }
}

export const logger = new Logger()
