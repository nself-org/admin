/**
 * Error handling utilities
 */

import { ApiError } from './ApiError'
import { ErrorCode } from './codes'

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unknown error occurred'
}

/**
 * Extract technical error message (for logging)
 */
export function getTechnicalErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return String(error)
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.retryable
  }

  // Network errors are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('fetch')
    )
  }

  return false
}

/**
 * Determine error code from error
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof ApiError) {
    return error.code
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCode.NETWORK_ERROR
    }
    if (message.includes('timeout')) {
      return ErrorCode.TIMEOUT
    }
    if (message.includes('offline')) {
      return ErrorCode.OFFLINE
    }

    // Auth errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorCode.UNAUTHORIZED
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorCode.FORBIDDEN
    }

    // Docker errors
    if (message.includes('docker')) {
      if (message.includes('not running')) {
        return ErrorCode.DOCKER_NOT_RUNNING
      }
      if (message.includes('container') && message.includes('not found')) {
        return ErrorCode.CONTAINER_NOT_FOUND
      }
    }

    // CLI errors
    if (message.includes('nself') || message.includes('cli')) {
      if (message.includes('not found')) {
        return ErrorCode.CLI_NOT_FOUND
      }
      if (message.includes('timeout')) {
        return ErrorCode.CLI_TIMEOUT
      }
    }

    // Database errors
    if (message.includes('database') || message.includes('postgres')) {
      if (message.includes('connection')) {
        return ErrorCode.DB_CONNECTION_FAILED
      }
      if (message.includes('query')) {
        return ErrorCode.QUERY_ERROR
      }
    }

    // File system errors
    if (message.includes('enoent') || message.includes('file not found')) {
      return ErrorCode.FILE_NOT_FOUND
    }
    if (message.includes('eacces') || message.includes('permission denied')) {
      return ErrorCode.PERMISSION_DENIED
    }
  }

  return ErrorCode.UNKNOWN_ERROR
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code >= 1000 && code < 2000
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code >= 2000 && code < 3000
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code >= 6000 && code < 7000
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
  if (error instanceof ApiError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      action: error.action,
      retryable: error.retryable,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    error: String(error),
  }
}

/**
 * Create a safe error object for API responses
 */
export function createErrorResponse(error: unknown, includeStack = false) {
  const apiError = ApiError.fromError(error)
  const response = {
    success: false as const,
    error: {
      code: apiError.code,
      message: includeStack ? apiError.message : apiError.userMessage,
      userMessage: apiError.userMessage,
      action: apiError.action,
      retryable: apiError.retryable,
      details: apiError.details,
    },
  }

  if (includeStack && apiError.stack) {
    response.error.details = {
      ...response.error.details,
      stack: apiError.stack,
    }
  }

  return response
}

/**
 * Handle Node.js errno errors
 */
export function handleNodeError(error: unknown): ApiError {
  const nodeError = error as NodeJS.ErrnoException

  switch (nodeError.code) {
    case 'ENOENT':
      return new ApiError(ErrorCode.FILE_NOT_FOUND, nodeError.message)
    case 'EACCES':
    case 'EPERM':
      return new ApiError(ErrorCode.PERMISSION_DENIED, nodeError.message)
    case 'EEXIST':
      return new ApiError(ErrorCode.FILE_ALREADY_EXISTS, nodeError.message)
    case 'ENOSPC':
      return new ApiError(ErrorCode.DISK_FULL, nodeError.message)
    case 'ECONNREFUSED':
      return new ApiError(ErrorCode.CONNECTION_REFUSED, nodeError.message)
    case 'ETIMEDOUT':
      return new ApiError(ErrorCode.TIMEOUT, nodeError.message)
    case 'ENOTFOUND':
      return new ApiError(ErrorCode.DNS_LOOKUP_FAILED, nodeError.message)
    default:
      return ApiError.fromError(error)
  }
}

/**
 * Extract error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack
  }
  return undefined
}

/**
 * Check if error is a specific type
 */
export function isErrorOfType<T extends Error>(
  error: unknown,
  errorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof errorClass
}

/**
 * Check if error is a Node.js system error with code
 */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as NodeJS.ErrnoException).code === 'string'
  )
}
