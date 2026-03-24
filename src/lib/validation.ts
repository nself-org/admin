import { z } from 'zod'

// Authentication schemas
export const loginSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .max(256, 'Password too long'),
})

// Docker operation schemas
export const dockerActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'remove', 'pause', 'unpause']),
  containerId: z.string().regex(/^[a-f0-9]{12,64}$/i, 'Invalid container ID'),
})

export const dockerBulkActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'remove']),
  containerIds: z.array(z.string().regex(/^[a-f0-9]{12,64}$/i)),
})

// Database query schemas
export const databaseQuerySchema = z.object({
  query: z.string().min(1).max(10000),
  database: z.string().optional(),
  timeout: z.number().min(1000).max(60000).optional(), // 1-60 seconds
})

// SQL injection prevention - dangerous keywords check
const DANGEROUS_SQL_KEYWORDS_PROD = [
  'DROP DATABASE',
  'DROP SCHEMA',
  'DROP TABLE',
  'DROP INDEX',
  'TRUNCATE',
  'DELETE FROM pg_',
  'DELETE FROM information_schema',
  'ALTER USER',
  'CREATE USER',
  'DROP USER',
  'GRANT',
  'REVOKE',
]

export function validateSQLQuery(
  query: string,
  isProduction: boolean = false,
): { valid: boolean; error?: string } {
  // In production, block dangerous operations
  if (isProduction) {
    const upperQuery = query.toUpperCase()
    for (const keyword of DANGEROUS_SQL_KEYWORDS_PROD) {
      if (upperQuery.includes(keyword)) {
        return {
          valid: false,
          error: `Dangerous SQL operation '${keyword}' is not allowed in production`,
        }
      }
    }
  }

  // Check for comment-based SQL injection attempts
  if (query.includes('--') || query.includes('/*') || query.includes('*/')) {
    // Allow comments only if they're properly formatted
    const hasValidComments =
      /--\s+.+/.test(query) || /\/\*[\s\S]*?\*\//.test(query)
    if (!hasValidComments && (query.includes('--') || query.includes('/*'))) {
      return {
        valid: false,
        error: 'Invalid SQL comment syntax detected',
      }
    }
  }

  return { valid: true }
}

// Configuration schemas
export const envUpdateSchema = z.object({
  key: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Invalid environment variable name'),
  value: z.string().max(10000),
  description: z.string().optional(),
})

export const configFileSchema = z.object({
  filename: z.string().regex(/^[a-zA-Z0-9_\-.]+$/, 'Invalid filename'),
  content: z.string().max(1000000), // 1MB max
  backup: z.boolean().optional(),
})

// Service management schemas
export const serviceCommandSchema = z.object({
  service: z.string().regex(/^[a-z][a-z0-9_-]*$/i),
  command: z.enum(['logs', 'inspect', 'stats', 'exec']),
  args: z.array(z.string()).optional(),
})

// Project schemas
export const projectInitSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9-]*$/),
  template: z.enum(['basic', 'full', 'minimal', 'custom']).optional(),
  services: z.array(z.string()).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
})

// Backup/Restore schemas
export const backupSchema = z.object({
  includeDatabase: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
  includeConfig: z.boolean().default(true),
  compression: z.enum(['gzip', 'bzip2', 'none']).default('gzip'),
  encryptionKey: z.string().optional(),
})

export const restoreSchema = z.object({
  backupFile: z.string(),
  includeDatabase: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
  includeConfig: z.boolean().default(true),
  decryptionKey: z.string().optional(),
})

// CLI execution schemas
export const cliCommandSchema = z.object({
  command: z.string().regex(/^[a-z][a-z-]*$/, 'Invalid command'),
  args: z.array(z.string()).max(20),
  options: z.record(z.string(), z.any()).optional(),
  timeout: z.number().min(1000).max(300000).optional(), // 1-300 seconds
})

// Sanitization helpers
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  // Only allow http, https, mailto, and relative URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed
  }
  // Block javascript:, data:, vbscript:, and other dangerous schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return '#'
  }
  // Relative URLs without scheme are safe
  return trimmed
}

export function sanitizePath(path: string): string {
  // Normalize path first
  let sanitized = path.trim()

  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove any directory traversal attempts
  sanitized = sanitized.replace(/\.\.\/|\.\.\\/g, '')

  // Remove double slashes
  sanitized = sanitized.replace(/\/+/g, '/')

  // Ensure path doesn't escape allowed directories
  const allowedPrefixes = ['/project', '/backups', '/data', '/tmp']
  const hasAllowedPrefix = allowedPrefixes.some((prefix) =>
    sanitized.startsWith(prefix),
  )

  if (!hasAllowedPrefix && !sanitized.startsWith('./')) {
    // Force path to be relative to project directory
    sanitized = `/project/${sanitized.replace(/^\//, '')}`
  }

  return sanitized
}

export function sanitizeCommand(command: string): string {
  // This function is deprecated - use structured command execution instead
  // Only kept for backward compatibility
  return command.replace(/[;&|`$()<>\n\r]/g, '')
}

// Shell argument escaping for safe execution
export function escapeShellArg(arg: string): string {
  // If arg is empty, return empty quotes
  if (!arg) return "''"

  // If arg contains no special characters, return as-is
  if (/^[a-zA-Z0-9_\-/.]+$/.test(arg)) {
    return arg
  }

  // Otherwise, wrap in single quotes and escape any single quotes
  return "'" + arg.replace(/'/g, "'\\'") + "'"
}

// Validate container/service names
export function isValidContainerName(name: string): boolean {
  // Docker container names must match [a-zA-Z0-9][a-zA-Z0-9_.-]*
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)
}

// Validate environment variable names
export function isValidEnvVarName(name: string): boolean {
  // Environment variables should be uppercase with underscores
  return /^[A-Z][A-Z0-9_]*$/.test(name)
}

// Validate file paths
export function isValidFilePath(path: string): boolean {
  // Check for directory traversal
  if (path.includes('..')) return false

  // Check for null bytes
  if (path.includes('\0')) return false

  // Check for shell metacharacters
  if (/[;&|`$()<>]/.test(path)) return false

  return true
}

// Validation middleware helper
export async function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
): Promise<
  { success: true; data: T } | { success: false; errors: z.ZodError }
> {
  try {
    const validated = await schema.parseAsync(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}
