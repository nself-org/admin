import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

export interface ValidationCheck {
  name: string
  category: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  suggestion?: string
}

export interface ValidationResult {
  checks: ValidationCheck[]
  categories: Record<string, { total: number; passed: number; failed: number; warnings: number }>
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
    score: string
  }
  rawOutput: string
  timestamp: string
}

/**
 * Parse raw CLI output from `nself config validate` into structured checks.
 * The CLI may output lines like:
 *   [PASS] Database connection is healthy
 *   [FAIL] SSL certificate is missing
 *   [WARN] Redis cache is not configured
 *   ✓ Docker is running
 *   ✗ Hasura metadata is out of sync
 *   ⚠ MinIO bucket policy not set
 *
 * We also handle section headers like:
 *   === Database Checks ===
 *   -- Network --
 */
function parseCLIOutput(output: string): ValidationCheck[] {
  const checks: ValidationCheck[] = []
  let currentCategory = 'general'

  const lines = output.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect category headers: === Category === or -- Category -- or [Category]
    const categoryMatch =
      trimmed.match(/^[=\x2d]{2,}\s*(.+?)\s*[=\x2d]{2,}$/) ||
      trimmed.match(/^\[([A-Z][a-zA-Z\s]+)\]$/) ||
      trimmed.match(/^#{1,3}\s+(.+)$/)
    if (categoryMatch) {
      currentCategory = categoryMatch[1]
        .toLowerCase()
        .replace(/\s+checks?$/i, '')
        .trim()
      continue
    }

    // Parse [PASS], [FAIL], [WARN] format
    const bracketMatch = trimmed.match(/^\[(PASS|FAIL|WARN|OK|ERROR|WARNING|INFO)\]\s*(.+)$/i)
    if (bracketMatch) {
      const rawStatus = bracketMatch[1].toUpperCase()
      const message = bracketMatch[2].trim()
      let status: 'pass' | 'fail' | 'warning' = 'pass'
      if (rawStatus === 'FAIL' || rawStatus === 'ERROR') status = 'fail'
      else if (rawStatus === 'WARN' || rawStatus === 'WARNING') status = 'warning'

      checks.push({
        name: extractCheckName(message),
        category: inferCategory(currentCategory, message),
        status,
        message,
        suggestion: status === 'fail' ? inferSuggestion(message) : undefined,
      })
      continue
    }

    // Parse checkmark/cross format: ✓ / ✗ / ⚠ or [x] / [ ] patterns
    const symbolMatch = trimmed.match(/^([✓✔☑]|[✗✘☒❌]|[⚠⚡]|PASS|FAIL|WARN)\s+(.+)$/)
    if (symbolMatch) {
      const symbol = symbolMatch[1]
      const message = symbolMatch[2].trim()
      let status: 'pass' | 'fail' | 'warning' = 'pass'
      if (/[✗✘☒❌]|FAIL/.test(symbol)) status = 'fail'
      else if (/[⚠⚡]|WARN/.test(symbol)) status = 'warning'

      checks.push({
        name: extractCheckName(message),
        category: inferCategory(currentCategory, message),
        status,
        message,
        suggestion: status === 'fail' ? inferSuggestion(message) : undefined,
      })
      continue
    }

    // Parse colon-separated lines: "Check Name: PASS" or "Check Name: OK"
    const colonMatch = trimmed.match(
      /^(.+?):\s*(PASS|FAIL|OK|ERROR|WARN|WARNING|HEALTHY|UNHEALTHY|UP|DOWN|RUNNING|STOPPED)$/i
    )
    if (colonMatch) {
      const name = colonMatch[1].trim()
      const rawStatus = colonMatch[2].toUpperCase()
      let status: 'pass' | 'fail' | 'warning' = 'pass'
      if (['FAIL', 'ERROR', 'UNHEALTHY', 'DOWN', 'STOPPED'].includes(rawStatus)) status = 'fail'
      else if (['WARN', 'WARNING'].includes(rawStatus)) status = 'warning'

      checks.push({
        name,
        category: inferCategory(currentCategory, name),
        status,
        message: `${name}: ${colonMatch[2]}`,
        suggestion: status === 'fail' ? inferSuggestion(name) : undefined,
      })
      continue
    }
  }

  return checks
}

/**
 * Extract a short check name from a message.
 */
function extractCheckName(message: string): string {
  // Remove trailing details after dash or parenthesis
  const cleaned = message.replace(/\s*[-–(].*$/, '').trim()
  // Cap length
  return cleaned.length > 60 ? cleaned.substring(0, 57) + '...' : cleaned
}

/**
 * Infer category from the current section header and the check message.
 */
function inferCategory(currentCategory: string, message: string): string {
  const lower = message.toLowerCase()

  if (
    lower.includes('postgres') ||
    lower.includes('database') ||
    lower.includes('db ') ||
    lower.includes('migration') ||
    lower.includes('hasura')
  ) {
    return 'database'
  }
  if (
    lower.includes('auth') ||
    lower.includes('jwt') ||
    lower.includes('token') ||
    lower.includes('password') ||
    lower.includes('secret')
  ) {
    return 'auth'
  }
  if (
    lower.includes('ssl') ||
    lower.includes('certificate') ||
    lower.includes('tls') ||
    lower.includes('https')
  ) {
    return 'ssl'
  }
  if (lower.includes('docker') || lower.includes('container') || lower.includes('compose')) {
    return 'services'
  }
  if (
    lower.includes('network') ||
    lower.includes('port') ||
    lower.includes('dns') ||
    lower.includes('nginx') ||
    lower.includes('proxy')
  ) {
    return 'network'
  }
  if (
    lower.includes('redis') ||
    lower.includes('minio') ||
    lower.includes('storage') ||
    lower.includes('cache')
  ) {
    return 'storage'
  }
  if (lower.includes('mail') || lower.includes('smtp') || lower.includes('email')) {
    return 'email'
  }
  if (
    lower.includes('env') ||
    lower.includes('config') ||
    lower.includes('variable') ||
    lower.includes('setting')
  ) {
    return 'config'
  }

  return currentCategory || 'general'
}

/**
 * Provide fix-it suggestions based on common failure patterns.
 */
function inferSuggestion(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('postgres') && lower.includes('connect')) {
    return 'Ensure PostgreSQL is running: nself restart postgres'
  }
  if (lower.includes('ssl') || lower.includes('certificate')) {
    return 'Generate SSL certificates: nself ssl generate'
  }
  if (lower.includes('hasura') && lower.includes('metadata')) {
    return 'Sync Hasura metadata: nself db sync'
  }
  if (lower.includes('docker') && lower.includes('not running')) {
    return 'Start Docker Desktop and try again'
  }
  if (lower.includes('env') && lower.includes('missing')) {
    return 'Create environment file: nself build'
  }
  if (lower.includes('port') && lower.includes('in use')) {
    return 'Stop conflicting service or change the port in .env'
  }
  if (lower.includes('password') || lower.includes('secret')) {
    return 'Generate new secrets: nself secrets generate'
  }
  if (lower.includes('redis')) {
    return 'Restart Redis: nself restart redis'
  }
  if (lower.includes('minio') || lower.includes('storage')) {
    return 'Restart MinIO: nself restart minio'
  }
  if (lower.includes('nginx') || lower.includes('proxy')) {
    return 'Restart Nginx: nself restart nginx'
  }
  if (lower.includes('migration')) {
    return 'Run migrations: nself db migrate'
  }
  if (lower.includes('auth')) {
    return 'Restart auth service: nself restart auth'
  }

  return 'Run nself doctor --fix to attempt automatic repair'
}

/**
 * Build category summary from parsed checks.
 */
function buildCategorySummary(
  checks: ValidationCheck[]
): Record<string, { total: number; passed: number; failed: number; warnings: number }> {
  const categories: Record<
    string,
    { total: number; passed: number; failed: number; warnings: number }
  > = {}

  for (const check of checks) {
    if (!categories[check.category]) {
      categories[check.category] = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      }
    }
    categories[check.category].total++
    if (check.status === 'pass') categories[check.category].passed++
    else if (check.status === 'fail') categories[check.category].failed++
    else if (check.status === 'warning') categories[check.category].warnings++
  }

  return categories
}

export async function GET(): Promise<Response> {
  try {
    const result = await executeNselfCommand('config', ['validate'])

    const rawOutput = result.stdout || result.stderr || ''
    let checks = parseCLIOutput(rawOutput)

    // If the CLI returned nothing parseable, fall back to nself doctor
    if (checks.length === 0 && !result.success) {
      const doctorResult = await executeNselfCommand('doctor', [])
      const doctorOutput = doctorResult.stdout || doctorResult.stderr || ''
      checks = parseCLIOutput(doctorOutput)

      // If still empty, create a synthetic failure entry
      if (checks.length === 0) {
        const errorMsg = result.error || doctorResult.error || 'Validation command not available'
        checks.push({
          name: 'CLI Validation',
          category: 'general',
          status: 'fail',
          message: errorMsg,
          suggestion: 'Ensure nself CLI is installed and up to date: nself update --cli',
        })
      }
    }

    const categories = buildCategorySummary(checks)
    const total = checks.length
    const passed = checks.filter((c) => c.status === 'pass').length
    const failed = checks.filter((c) => c.status === 'fail').length
    const warnings = checks.filter((c) => c.status === 'warning').length

    const response: ValidationResult = {
      checks,
      categories,
      summary: {
        total,
        passed,
        failed,
        warnings,
        score: `${passed}/${total}`,
      },
      rawOutput,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
