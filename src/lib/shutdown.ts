/**
 * Graceful shutdown handler for nself-admin
 * Handles SIGTERM/SIGINT signals to properly close resources
 */

import { getDatabase } from './database'

let isShuttingDown = false
const shutdownHandlers: Array<() => Promise<void> | void> = []

/**
 * Register a shutdown handler
 */
export function onShutdown(handler: () => Promise<void> | void): void {
  shutdownHandlers.push(handler)
}

/**
 * Check if application is shutting down
 */
export function isGracefulShutdown(): boolean {
  return isShuttingDown
}

/**
 * Execute graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  const timeout = setTimeout(() => {
    console.error('Graceful shutdown timeout - forcing exit')
    process.exit(1)
  }, 25000) // 25 seconds timeout (Docker has 30 second default)

  try {
    // Run all registered shutdown handlers
    await Promise.all(
      shutdownHandlers.map(async (handler, index) => {
        try {
          await handler()
        } catch (error) {
          console.error(`Shutdown handler ${index + 1} failed:`, error)
        }
      }),
    )

    // Close database connections
    try {
      const db = await getDatabase()
      if (db) {
        await new Promise<void>((resolve, reject) => {
          db.close((err?: Error) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    } catch (error) {
      console.error('Failed to close database:', error)
    }

    clearTimeout(timeout)
    process.exit(0)
  } catch (error) {
    clearTimeout(timeout)
    console.error('Graceful shutdown failed:', error)
    process.exit(1)
  }
}

/**
 * Initialize graceful shutdown handlers
 * Call this once during application startup
 */
export function initializeGracefulShutdown(): void {
  // Avoid multiple registrations
  if (process.listeners('SIGTERM').length > 0) {
    return
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
    gracefulShutdown('uncaughtException').then(() => process.exit(1))
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason)
    gracefulShutdown('unhandledRejection').then(() => process.exit(1))
  })
}
