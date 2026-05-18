/**
 * Custom API Error class
 */

import { ErrorCode } from './codes'
import { getErrorMessageForCode } from './messages'

export interface ApiErrorData {
  code: ErrorCode
  message: string
  userMessage: string
  action?: string
  retryable: boolean
  details?: Record<string, unknown>
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly userMessage: string
  public readonly action?: string
  public readonly retryable: boolean
  public readonly details?: Record<string, unknown>
  public readonly statusCode: number

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, unknown>,
    statusCode?: number
  ) {
    const errorMessage = getErrorMessageForCode(code)
    super(message || errorMessage.userMessage)

    this.name = 'ApiError'
    this.code = code
    this.userMessage = errorMessage.userMessage
    this.action = errorMessage.action
    this.retryable = errorMessage.retryable
    this.details = details
    this.statusCode = statusCode || this.getDefaultStatusCode(code)

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * Get default HTTP status code for error code
   */
  private getDefaultStatusCode(code: ErrorCode): number {
    // Auth errors → 401 or 403
    if (code >= 2000 && code < 3000) {
      if (
        code === ErrorCode.UNAUTHORIZED ||
        code === ErrorCode.SESSION_EXPIRED ||
        code === ErrorCode.INVALID_CREDENTIALS ||
        code === ErrorCode.SESSION_NOT_FOUND ||
        code === ErrorCode.AUTHENTICATION_REQUIRED
      ) {
        return 401
      }
      if (code === ErrorCode.FORBIDDEN || code === ErrorCode.CSRF_TOKEN_INVALID) {
        return 403
      }
      if (code === ErrorCode.TOO_MANY_LOGIN_ATTEMPTS || code === ErrorCode.RATE_LIMITED) {
        return 429
      }
      return 400
    }

    // Validation errors → 400
    if (code >= 6000 && code < 7000) {
      return 400
    }

    // Not found errors → 404
    if (
      code === ErrorCode.FILE_NOT_FOUND ||
      code === ErrorCode.CONTAINER_NOT_FOUND ||
      code === ErrorCode.SERVICE_NOT_FOUND ||
      code === ErrorCode.BACKUP_NOT_FOUND ||
      code === ErrorCode.PLUGIN_NOT_FOUND
    ) {
      return 404
    }

    // Timeout errors → 408
    if (
      code === ErrorCode.TIMEOUT ||
      code === ErrorCode.CLI_TIMEOUT ||
      code === ErrorCode.DB_TIMEOUT ||
      code === ErrorCode.OPERATION_TIMEOUT
    ) {
      return 408
    }

    // Conflict errors → 409
    if (
      code === ErrorCode.SERVICE_ALREADY_RUNNING ||
      code === ErrorCode.SERVICE_ALREADY_STOPPED ||
      code === ErrorCode.FILE_ALREADY_EXISTS ||
      code === ErrorCode.DUPLICATE_KEY ||
      code === ErrorCode.PROJECT_ALREADY_INITIALIZED
    ) {
      return 409
    }

    // Service unavailable → 503
    if (
      code === ErrorCode.DOCKER_NOT_RUNNING ||
      code === ErrorCode.DB_CONNECTION_FAILED ||
      code === ErrorCode.CLI_NOT_FOUND
    ) {
      return 503
    }

    // Default to 500 for all other errors
    return 500
  }

  /**
   * Convert to JSON response format
   */
  toJSON(): ApiErrorData {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      action: this.action,
      retryable: this.retryable,
      details: this.details,
    }
  }

  /**
   * Create ApiError from unknown error
   */
  static fromError(error: unknown, defaultCode = ErrorCode.UNKNOWN_ERROR): ApiError {
    if (error instanceof ApiError) {
      return error
    }

    if (error instanceof Error) {
      return new ApiError(defaultCode, error.message)
    }

    return new ApiError(defaultCode, String(error))
  }

  /**
   * Create network error
   */
  static network(message?: string): ApiError {
    return new ApiError(ErrorCode.NETWORK_ERROR, message)
  }

  /**
   * Create timeout error
   */
  static timeout(message?: string): ApiError {
    return new ApiError(ErrorCode.TIMEOUT, message)
  }

  /**
   * Create unauthorized error
   */
  static unauthorized(message?: string): ApiError {
    return new ApiError(ErrorCode.UNAUTHORIZED, message)
  }

  /**
   * Create validation error
   */
  static validation(message?: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, details)
  }

  /**
   * Create not found error
   */
  static notFound(resource: string): ApiError {
    return new ApiError(ErrorCode.FILE_NOT_FOUND, `${resource} not found`)
  }
}
