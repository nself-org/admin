/**
 * Client-side API utilities with retry logic and error handling
 */

import { ApiError } from './errors/ApiError'
import { ErrorCode } from './errors/codes'
import { isRetryableError } from './errors/utils'

export interface RequestConfig extends RequestInit {
  timeout?: number
  retry?: boolean
  maxRetries?: number
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000 // 1 second (exponential backoff)

/**
 * Get CSRF token from cookie
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'nself-csrf') {
      return value
    }
  }
  return null
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if error should be retried
 */
function shouldRetry(
  error: unknown,
  attempt: number,
  maxRetries: number,
): boolean {
  // No more retries left
  if (attempt >= maxRetries) {
    return false
  }

  // Don't retry auth errors (401/403)
  if (error instanceof ApiError) {
    const code = error.code
    // Auth errors (2xxx)
    if (code >= 2000 && code < 3000) {
      return false
    }
    // Validation errors (6xxx)
    if (code >= 6000 && code < 7000) {
      return false
    }
  }

  // Retry if error is retryable (network errors)
  return isRetryableError(error)
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  config: RequestConfig,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(ErrorCode.TIMEOUT, 'Request timed out')
    }

    // Network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(ErrorCode.NETWORK_ERROR, 'Network request failed')
    }

    throw error
  }
}

/**
 * Parse error response
 */
async function parseErrorResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return { message: response.statusText }
  }
}

/**
 * Map HTTP status code to ErrorCode
 */
function mapStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.VALIDATION_ERROR
    case 401:
      return ErrorCode.UNAUTHORIZED
    case 403:
      return ErrorCode.FORBIDDEN
    case 404:
      return ErrorCode.FILE_NOT_FOUND
    case 408:
      return ErrorCode.TIMEOUT
    case 409:
      return ErrorCode.DUPLICATE_KEY
    case 429:
      return ErrorCode.RATE_LIMITED
    case 503:
      return ErrorCode.DOCKER_NOT_RUNNING
    default:
      return ErrorCode.INTERNAL_SERVER_ERROR
  }
}

/**
 * Create ApiError from response
 */
async function createErrorFromResponse(response: Response): Promise<ApiError> {
  const data = await parseErrorResponse(response)

  // If response has error code, use it
  if (data && typeof data === 'object' && 'error' in data) {
    const errorObj = data.error as {
      code?: ErrorCode
      message?: string
      userMessage?: string
      details?: Record<string, unknown>
    }

    if (errorObj.code) {
      return new ApiError(
        errorObj.code,
        errorObj.message,
        errorObj.details,
        response.status,
      )
    }
  }

  // Map HTTP status to error code
  const errorCode = mapStatusToErrorCode(response.status)
  const message =
    data && typeof data === 'object' && 'message' in data
      ? String((data as { message: unknown }).message)
      : response.statusText

  return new ApiError(errorCode, message, undefined, response.status)
}

/**
 * Make an authenticated API request with CSRF token and retry logic
 */
export async function apiRequest(
  url: string,
  config: RequestConfig = {},
): Promise<Response> {
  const csrfToken = getCSRFToken()
  const headers = new Headers(config.headers)

  // Add CSRF token if available and it's a state-changing request
  if (
    csrfToken &&
    config.method &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)
  ) {
    headers.set('x-csrf-token', csrfToken)
  }

  // Add JSON content type if body is present and not FormData
  if (config.body && !(config.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const maxRetries =
    config.retry !== false ? (config.maxRetries ?? DEFAULT_MAX_RETRIES) : 0

  let lastError: unknown

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          ...config,
          headers,
          credentials: 'same-origin', // Include cookies
        },
        timeout,
      )

      // Handle non-2xx responses
      if (!response.ok) {
        const error = await createErrorFromResponse(response)
        throw error
      }

      return response
    } catch (error) {
      lastError = error

      // Don't retry on non-retryable errors
      if (!shouldRetry(error, attempt, maxRetries)) {
        throw error
      }

      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Make a POST request with CSRF protection and retry logic
 */
export async function apiPost(
  url: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<Response> {
  return apiRequest(url, {
    ...config,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Make a GET request with retry logic
 */
export async function apiGet(
  url: string,
  config?: RequestConfig,
): Promise<Response> {
  return apiRequest(url, { ...config, method: 'GET' })
}

/**
 * Make a DELETE request with CSRF protection and retry logic
 */
export async function apiDelete(
  url: string,
  config?: RequestConfig,
): Promise<Response> {
  return apiRequest(url, { ...config, method: 'DELETE' })
}

/**
 * Make a PUT request with CSRF protection and retry logic
 */
export async function apiPut(
  url: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<Response> {
  return apiRequest(url, {
    ...config,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Make a PATCH request with CSRF protection and retry logic
 */
export async function apiPatch(
  url: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<Response> {
  return apiRequest(url, {
    ...config,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  })
}

// Export convenience API object
export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  request: apiRequest,
}
