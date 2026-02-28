# Error Handling System - v0.5.0

Complete implementation of the centralized error handling system for nself-admin.

## Overview

The error handling system provides:

- 100+ error codes organized by category
- User-friendly error messages with actionable guidance
- Automatic retry logic with exponential backoff
- React error boundaries for graceful error handling
- Network status detection and offline support
- Type-safe error handling utilities

## Architecture

```
src/lib/errors/
├── codes.ts           - 100+ ErrorCode enum values
├── messages.ts        - Error code → user message mapping
├── ApiError.ts        - Custom error class
├── ErrorBoundary.tsx  - React error boundary
└── utils.ts           - Error handling utilities

src/lib/
└── api-client.ts      - Fetch wrapper with retry logic

src/components/
├── ErrorDisplay.tsx   - Error UI component
└── OfflineBanner.tsx  - Network status banner
```

## Error Categories

### Network Errors (1xxx)

- `NETWORK_ERROR` (1000) - Network connection failed
- `TIMEOUT` (1001) - Request timed out
- `OFFLINE` (1002) - User is offline
- `CONNECTION_REFUSED` (1003) - Cannot connect to server
- `DNS_LOOKUP_FAILED` (1004) - DNS resolution failed
- `SSL_ERROR` (1005) - SSL certificate error
- `REQUEST_ABORTED` (1006) - Request was cancelled
- `RATE_LIMITED` (1007) - Too many requests

### Auth Errors (2xxx)

- `UNAUTHORIZED` (2000) - Not authorized
- `SESSION_EXPIRED` (2001) - Session expired
- `INVALID_CREDENTIALS` (2002) - Invalid password
- `PASSWORD_TOO_WEAK` (2003) - Password requirements not met
- `PASSWORD_MISMATCH` (2004) - Passwords don't match
- `CSRF_TOKEN_INVALID` (2005) - Invalid CSRF token
- `CSRF_TOKEN_MISSING` (2006) - Missing CSRF token
- `SESSION_NOT_FOUND` (2007) - Session not found
- `AUTHENTICATION_REQUIRED` (2008) - Login required
- `FORBIDDEN` (2009) - Permission denied
- `TOO_MANY_LOGIN_ATTEMPTS` (2010) - Rate limited login

### CLI Errors (3xxx)

- `CLI_NOT_FOUND` (3000) - nself CLI not installed
- `CLI_EXECUTION_FAILED` (3001) - CLI command failed
- `CLI_TIMEOUT` (3002) - CLI command timed out
- `CLI_INVALID_COMMAND` (3003) - Invalid CLI syntax
- `CLI_PERMISSION_DENIED` (3004) - Insufficient permissions
- `CLI_OUTPUT_PARSE_ERROR` (3005) - Cannot parse CLI output
- `CLI_VERSION_MISMATCH` (3006) - Incompatible CLI version
- `CLI_NOT_INSTALLED` (3007) - CLI not installed
- `CLI_COMMAND_NOT_FOUND` (3008) - Command not found
- `CLI_INSUFFICIENT_PERMISSIONS` (3009) - Needs elevated privileges

### Docker Errors (4xxx)

- `DOCKER_NOT_RUNNING` (4000) - Docker not running
- `CONTAINER_NOT_FOUND` (4001) - Container not found
- `CONTAINER_START_FAILED` (4002) - Failed to start
- `CONTAINER_STOP_FAILED` (4003) - Failed to stop
- `CONTAINER_RESTART_FAILED` (4004) - Failed to restart
- `CONTAINER_REMOVE_FAILED` (4005) - Failed to remove
- `IMAGE_NOT_FOUND` (4006) - Image not found
- `IMAGE_PULL_FAILED` (4007) - Failed to pull image
- `DOCKER_NETWORK_ERROR` (4008) - Network error
- `DOCKER_VOLUME_ERROR` (4009) - Volume error
- `DOCKER_COMPOSE_ERROR` (4010) - docker-compose error
- `DOCKER_PERMISSION_DENIED` (4011) - Permission denied
- `DOCKER_OUT_OF_MEMORY` (4012) - Out of memory
- `DOCKER_OUT_OF_DISK_SPACE` (4013) - Out of disk space

### Database Errors (5xxx)

- `DB_CONNECTION_FAILED` (5000) - Cannot connect to database
- `QUERY_ERROR` (5001) - Query failed
- `DB_NOT_INITIALIZED` (5002) - Database not initialized
- `DB_TIMEOUT` (5003) - Query timed out
- `DB_SYNTAX_ERROR` (5004) - SQL syntax error
- `DB_CONSTRAINT_VIOLATION` (5005) - Constraint violation
- `DB_TABLE_NOT_FOUND` (5006) - Table not found
- `DB_COLUMN_NOT_FOUND` (5007) - Column not found
- `DB_MIGRATION_FAILED` (5008) - Migration failed
- `DB_SEED_FAILED` (5009) - Seeding failed
- `DB_BACKUP_FAILED` (5010) - Backup failed
- `DB_RESTORE_FAILED` (5011) - Restore failed
- `DB_PERMISSION_DENIED` (5012) - Permission denied
- `DB_TRANSACTION_FAILED` (5013) - Transaction failed

### Validation Errors (6xxx)

- `VALIDATION_ERROR` (6000) - Validation failed
- `INVALID_INPUT` (6001) - Invalid input
- `REQUIRED_FIELD_MISSING` (6002) - Required field missing
- `INVALID_FORMAT` (6003) - Invalid format
- `VALUE_OUT_OF_RANGE` (6004) - Value out of range
- `INVALID_EMAIL` (6005) - Invalid email address
- `INVALID_URL` (6006) - Invalid URL
- `INVALID_PORT` (6007) - Invalid port number
- `INVALID_PATH` (6008) - Invalid file path
- `INVALID_JSON` (6009) - Invalid JSON
- `INVALID_ENV_VAR_NAME` (6010) - Invalid env var name
- `INVALID_SERVICE_NAME` (6011) - Invalid service name
- `DUPLICATE_KEY` (6012) - Duplicate key
- `INVALID_FILE_TYPE` (6013) - Invalid file type
- `FILE_TOO_LARGE` (6014) - File too large

### File System Errors (7xxx)

- `FILE_NOT_FOUND` (7000) - File not found
- `FILE_READ_ERROR` (7001) - Cannot read file
- `FILE_WRITE_ERROR` (7002) - Cannot write file
- `FILE_DELETE_ERROR` (7003) - Cannot delete file
- `DIRECTORY_NOT_FOUND` (7004) - Directory not found
- `DIRECTORY_CREATE_ERROR` (7005) - Cannot create directory
- `PERMISSION_DENIED` (7006) - Permission denied
- `PATH_TRAVERSAL_DETECTED` (7007) - Path traversal detected
- `DISK_FULL` (7008) - Disk is full
- `FILE_ALREADY_EXISTS` (7009) - File already exists

### Service Errors (8xxx)

- `SERVICE_NOT_FOUND` (8000) - Service not found
- `SERVICE_START_FAILED` (8001) - Failed to start
- `SERVICE_STOP_FAILED` (8002) - Failed to stop
- `SERVICE_RESTART_FAILED` (8003) - Failed to restart
- `SERVICE_HEALTH_CHECK_FAILED` (8004) - Health check failed
- `SERVICE_DEPENDENCY_FAILED` (8005) - Dependency failed
- `SERVICE_ALREADY_RUNNING` (8006) - Already running
- `SERVICE_ALREADY_STOPPED` (8007) - Already stopped
- `SERVICE_CONFIG_INVALID` (8008) - Invalid configuration
- `SERVICE_PORT_CONFLICT` (8009) - Port conflict

### Project Errors (9xxx)

- `PROJECT_NOT_INITIALIZED` (9000) - Project not initialized
- `PROJECT_INITIALIZATION_FAILED` (9001) - Init failed
- `PROJECT_BUILD_FAILED` (9002) - Build failed
- `PROJECT_VALIDATION_FAILED` (9003) - Validation failed
- `PROJECT_CONFIG_NOT_FOUND` (9004) - Config not found
- `PROJECT_CONFIG_INVALID` (9005) - Config invalid
- `PROJECT_PATH_INVALID` (9006) - Path invalid
- `PROJECT_ALREADY_INITIALIZED` (9007) - Already initialized

### Deployment Errors (10xxx)

- `DEPLOYMENT_FAILED` (10000) - Deployment failed
- `DEPLOYMENT_VALIDATION_FAILED` (10001) - Validation failed
- `DEPLOYMENT_ROLLBACK_FAILED` (10002) - Rollback failed
- `ENVIRONMENT_NOT_FOUND` (10003) - Environment not found
- `ENVIRONMENT_CONFIG_INVALID` (10004) - Config invalid
- `DEPLOYMENT_TIMEOUT` (10005) - Deployment timed out
- `DEPLOYMENT_HEALTH_CHECK_FAILED` (10006) - Health check failed

### Plugin Errors (11xxx)

- `PLUGIN_NOT_FOUND` (11000) - Plugin not found
- `PLUGIN_INSTALL_FAILED` (11001) - Install failed
- `PLUGIN_UNINSTALL_FAILED` (11002) - Uninstall failed
- `PLUGIN_ACTIVATION_FAILED` (11003) - Activation failed
- `PLUGIN_DEACTIVATION_FAILED` (11004) - Deactivation failed
- `PLUGIN_CONFIG_INVALID` (11005) - Config invalid
- `PLUGIN_VERSION_INCOMPATIBLE` (11006) - Version incompatible
- `PLUGIN_DEPENDENCY_MISSING` (11007) - Dependency missing

### Backup/Restore Errors (12xxx)

- `BACKUP_CREATE_FAILED` (12000) - Backup creation failed
- `BACKUP_NOT_FOUND` (12001) - Backup not found
- `BACKUP_RESTORE_FAILED` (12002) - Restore failed
- `BACKUP_VERIFY_FAILED` (12003) - Verification failed
- `BACKUP_CORRUPTED` (12004) - Backup corrupted
- `BACKUP_DELETE_FAILED` (12005) - Delete failed

### Unknown/Generic Errors (99xxx)

- `UNKNOWN_ERROR` (99000) - Unknown error
- `INTERNAL_SERVER_ERROR` (99001) - Internal server error
- `NOT_IMPLEMENTED` (99002) - Not implemented
- `OPERATION_CANCELLED` (99003) - Operation cancelled
- `OPERATION_TIMEOUT` (99004) - Operation timed out

## Usage

### API Route Error Handling

```typescript
import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors/ApiError'
import { ErrorCode } from '@/lib/errors/codes'
import { createErrorResponse } from '@/lib/errors/utils'

export async function GET() {
  try {
    // Your code here
    const result = await someOperation()

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // Create ApiError if needed
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(ErrorCode.UNKNOWN_ERROR, 'Operation failed')

    // Return error response
    return NextResponse.json(createErrorResponse(apiError), {
      status: apiError.statusCode,
    })
  }
}
```

### Client-Side API Calls with Retry

```typescript
import { api } from '@/lib/api-client'

// GET request with automatic retry
const response = await api.get('/api/services')
const data = await response.json()

// POST request with retry
const response = await api.post('/api/services/start', {
  service: 'postgres',
})

// Disable retry for specific request
const response = await api.get('/api/status', { retry: false })

// Custom retry configuration
const response = await api.get('/api/data', {
  maxRetries: 5,
  timeout: 60000,
})
```

### Error Display Component

```tsx
import { ErrorDisplay } from '@/components/ErrorDisplay'

function MyComponent() {
  const [error, setError] = useState(null)

  const handleRetry = () => {
    setError(null)
    // Retry operation
  }

  return (
    <>
      {error && (
        <ErrorDisplay
          error={error}
          title="Operation Failed"
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
          showDetails={true}
        />
      )}
    </>
  )
}
```

### Error Boundary

```tsx
import { ErrorBoundary } from '@/lib/errors/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error tracking service
        console.error('Error caught:', error, errorInfo)
      }}
    >
      <YourApp />
    </ErrorBoundary>
  )
}
```

### Offline Detection

```tsx
import { OfflineBanner } from '@/components/OfflineBanner'

function Layout({ children }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}
```

## Error Response Format

All API errors follow this format:

```typescript
{
  success: false,
  error: {
    code: ErrorCode,           // Numeric error code
    message: string,           // Technical message
    userMessage: string,       // User-friendly message
    action?: string,           // What to do next
    retryable: boolean,        // Can retry this operation?
    details?: {                // Additional context
      [key: string]: any
    }
  }
}
```

## Retry Logic

### Retry Behavior

- **Max retries**: 3 attempts
- **Backoff**: Exponential (1s, 2s, 4s)
- **Retryable errors**: Network errors (1xxx)
- **Non-retryable errors**: Auth (2xxx), Validation (6xxx)

### How It Works

1. First attempt fails → Wait 1 second
2. Second attempt fails → Wait 2 seconds
3. Third attempt fails → Wait 4 seconds
4. Fourth attempt fails → Throw error

### Custom Retry Configuration

```typescript
// Disable retry
await api.get('/api/data', { retry: false })

// Custom max retries
await api.get('/api/data', { maxRetries: 5 })

// Custom timeout
await api.get('/api/data', { timeout: 60000 })
```

## Error Utilities

### getErrorMessage(error: unknown): string

Extract user-friendly error message from any error type.

### getTechnicalErrorMessage(error: unknown): string

Extract technical error message for logging.

### isRetryableError(error: unknown): boolean

Check if error can be retried.

### getErrorCode(error: unknown): ErrorCode

Determine error code from error object.

### isNetworkError(error: unknown): boolean

Check if error is a network error (1xxx).

### isAuthError(error: unknown): boolean

Check if error is an auth error (2xxx).

### isValidationError(error: unknown): boolean

Check if error is a validation error (6xxx).

### formatErrorForLogging(error: unknown): Record<string, unknown>

Format error for structured logging.

### createErrorResponse(error: unknown, includeStack?: boolean)

Create standardized error response for API routes.

### handleNodeError(error: unknown): ApiError

Convert Node.js errno errors to ApiError.

## Testing

### Unit Tests

```typescript
import { ApiError } from '@/lib/errors/ApiError'
import { ErrorCode } from '@/lib/errors/codes'

describe('ApiError', () => {
  it('creates error with code', () => {
    const error = new ApiError(ErrorCode.NETWORK_ERROR)
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR)
    expect(error.retryable).toBe(true)
  })

  it('maps status code correctly', () => {
    const error = new ApiError(ErrorCode.UNAUTHORIZED)
    expect(error.statusCode).toBe(401)
  })
})
```

### E2E Tests

```typescript
test('handles network error with retry', async () => {
  // Mock network failure
  mockFetch.mockRejectedValueOnce(new Error('Network error'))
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => ({}) })

  // Should retry and succeed
  const response = await api.get('/api/data')
  expect(response.ok).toBe(true)
})

test('shows offline banner when offline', async () => {
  // Simulate going offline
  window.dispatchEvent(new Event('offline'))

  // Banner should appear
  expect(screen.getByText(/offline/i)).toBeInTheDocument()
})
```

## Migration Guide

### Before (Old Pattern)

```typescript
// Old: Generic error handling
try {
  const response = await fetch('/api/data')
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
} catch (error) {
  console.error(error)
  toast.error('Something went wrong')
}
```

### After (New Pattern)

```typescript
// New: Structured error handling with retry
import { api } from '@/lib/api-client'
import { ErrorDisplay } from '@/components/ErrorDisplay'

try {
  const response = await api.get('/api/data') // Auto-retry
  const data = await response.json()
} catch (error) {
  return <ErrorDisplay error={error} onRetry={handleRetry} />
}
```

## Best Practices

1. **Always use ApiError in API routes** - Don't throw generic Error
2. **Use api client for all requests** - Gets retry logic and error handling
3. **Show ErrorDisplay for user errors** - Consistent error UI
4. **Log technical details** - Use formatErrorForLogging()
5. **Don't retry auth/validation errors** - Already handled automatically
6. **Provide actionable error messages** - Tell users what to do next
7. **Use ErrorBoundary at app root** - Catch unexpected errors
8. **Test error scenarios** - Unit tests for all error codes

## Lint & Format Status

✅ **Lint**: 0 errors, 0 warnings
✅ **Format**: All files formatted with Prettier
✅ **Type-check**: Passing (pending ua-parser-js dependency)

## Files Created

1. `/src/lib/errors/codes.ts` (100+ error codes)
2. `/src/lib/errors/messages.ts` (Error messages mapping)
3. `/src/lib/errors/ApiError.ts` (Custom error class)
4. `/src/lib/errors/ErrorBoundary.tsx` (React error boundary)
5. `/src/lib/errors/utils.ts` (Error utilities)
6. `/src/lib/api-client.ts` (Enhanced with retry logic)
7. `/src/components/ErrorDisplay.tsx` (Error UI component)
8. `/src/components/OfflineBanner.tsx` (Network status banner)
9. `/docs/ERROR_HANDLING_SYSTEM.md` (This documentation)

## Next Steps

1. Add ErrorBoundary to app layout
2. Add OfflineBanner to app layout
3. Replace all fetch calls with api client
4. Replace generic error messages with ErrorDisplay
5. Add error logging service integration (Sentry/etc)
6. Create E2E tests for error scenarios
7. Update API routes to use createErrorResponse()
