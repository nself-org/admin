/**
 * Global error handling utilities
 */

/**
 * Suppress AbortError messages in console
 * These are expected when navigating away from pages
 */
export function suppressAbortErrors() {
  // This function is no longer needed as console.error statements have been removed
}

/**
 */
export function restoreConsoleError() {}

/**
 * Safe fetch wrapper that handles aborts gracefully
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(url, options)
    return response
  } catch (error) {
    // Silently handle abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Create an abort controller with timeout
 */
export function createTimeoutController(timeoutMs: number = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return {
    controller,
    clear: () => clearTimeout(timeoutId),
  }
}
