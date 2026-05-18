import { NextRequest, NextResponse } from 'next/server'

// Request size limits
export const REQUEST_SIZE_LIMITS = {
  default: 1 * 1024 * 1024, // 1MB
  upload: 10 * 1024 * 1024, // 10MB for file uploads
  config: 1 * 1024 * 1024, // 1MB for config files
  database: 100 * 1024, // 100KB for database queries
}

// Response size limits
export const RESPONSE_SIZE_LIMITS = {
  json: 10 * 1024 * 1024, // 10MB for JSON responses
  stream: Infinity, // No limit for streaming responses
}

/**
 * Check if request exceeds size limit
 */
export function checkRequestSize(
  request: NextRequest,
  limit: number = REQUEST_SIZE_LIMITS.default
): { valid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length')

  if (!contentLength) {
    // No content-length header, allow (will be caught by body parser)
    return { valid: true }
  }

  const size = parseInt(contentLength, 10)

  if (isNaN(size)) {
    return { valid: false, error: 'Invalid content-length header' }
  }

  if (size > limit) {
    return {
      valid: false,
      error: `Request too large. Maximum size: ${formatBytes(limit)}`,
    }
  }

  return { valid: true }
}

/**
 * Get size limit for specific route
 */
export function getSizeLimitForRoute(pathname: string): number {
  // Upload routes
  if (pathname.includes('/upload') || pathname.includes('/backup')) {
    return REQUEST_SIZE_LIMITS.upload
  }

  // Config routes
  if (pathname.includes('/config') || pathname.includes('/env')) {
    return REQUEST_SIZE_LIMITS.config
  }

  // Database routes
  if (pathname.includes('/database/query')) {
    return REQUEST_SIZE_LIMITS.database
  }

  // Default
  return REQUEST_SIZE_LIMITS.default
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Create error response for size limit exceeded
 */
export function sizeLimitErrorResponse(limit: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Request size limit exceeded',
      maxSize: formatBytes(limit),
      details: `Maximum request size is ${formatBytes(limit)}`,
    },
    {
      status: 413, // 413 Payload Too Large
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '3600', // Suggest retry after 1 hour
      },
    }
  )
}

/**
 * Middleware to enforce request size limits
 */
export function enforceSizeLimit(request: NextRequest): NextResponse | null {
  // Skip for GET and HEAD requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null
  }

  const limit = getSizeLimitForRoute(request.nextUrl.pathname)
  const check = checkRequestSize(request, limit)

  if (!check.valid) {
    return sizeLimitErrorResponse(limit)
  }

  return null
}

/**
 * Check response size (for streaming protection)
 */
export class SizeLimitedStream {
  private bytesWritten = 0
  private maxSize: number

  constructor(maxSize: number = RESPONSE_SIZE_LIMITS.json) {
    this.maxSize = maxSize
  }

  write(chunk: Uint8Array | string): boolean {
    const chunkSize = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length

    this.bytesWritten += chunkSize

    if (this.bytesWritten > this.maxSize) {
      throw new Error(`Response size limit exceeded: ${formatBytes(this.maxSize)}`)
    }

    return true
  }

  getBytesWritten(): number {
    return this.bytesWritten
  }
}
