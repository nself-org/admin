/**
 * Schema validation for nself environment variables.
 *
 * Validates variable values against format-based and name-based rules without
 * requiring knowledge of which services are enabled.
 */

export type EnvVarSeverity = 'error' | 'warn'

export interface EnvVarRule {
  test: (value: string) => boolean
  message: string
  severity: EnvVarSeverity
}

export interface EnvVarSchemaEntry {
  description: string
  required: boolean
  rules: EnvVarRule[]
}

export interface EnvValidationResult {
  key: string
  value: string
  severity: EnvVarSeverity
  message: string
}

// Well-known nself environment variable schemas
const KNOWN_SCHEMAS: Record<string, EnvVarSchemaEntry> = {
  POSTGRES_PASSWORD: {
    description: 'PostgreSQL superuser password',
    required: true,
    rules: [
      {
        test: (v) => v.length >= 8,
        message: 'Must be at least 8 characters',
        severity: 'error',
      },
      {
        test: (v) => !/^(password|changeme|admin|postgres|default|secret)$/i.test(v),
        message: 'Must not use a common default password',
        severity: 'error',
      },
    ],
  },
  POSTGRES_USER: {
    description: 'PostgreSQL user name',
    required: true,
    rules: [
      {
        test: (v) => /^[a-z_][a-z0-9_]*$/i.test(v),
        message: 'Must be a valid identifier (letters, numbers, underscores)',
        severity: 'error',
      },
    ],
  },
  POSTGRES_DB: {
    description: 'PostgreSQL database name',
    required: true,
    rules: [
      {
        test: (v) => /^[a-z_][a-z0-9_]*$/i.test(v),
        message: 'Must be a valid identifier (letters, numbers, underscores)',
        severity: 'error',
      },
    ],
  },
  HASURA_GRAPHQL_ADMIN_SECRET: {
    description: 'Hasura admin secret key',
    required: true,
    rules: [
      {
        test: (v) => v.length >= 16,
        message: 'Must be at least 16 characters',
        severity: 'error',
      },
    ],
  },
  HASURA_GRAPHQL_JWT_SECRET: {
    description: 'Hasura JWT secret configuration (JSON)',
    required: false,
    rules: [
      {
        test: (v) => {
          try {
            const parsed = JSON.parse(v)
            return typeof parsed === 'object' && parsed !== null && 'key' in parsed
          } catch {
            return false
          }
        },
        message: 'Must be valid JSON with a "key" field',
        severity: 'error',
      },
    ],
  },
  NSELF_ADMIN_PASSWORD: {
    description: 'nself admin UI password',
    required: false,
    rules: [
      {
        test: (v) => v.length >= 12,
        message: 'Must be at least 12 characters',
        severity: 'warn',
      },
    ],
  },
}

// Format-based rules that apply to env var names matching patterns
interface FormatRule {
  pattern: RegExp
  rule: EnvVarRule
}

const FORMAT_RULES: FormatRule[] = [
  {
    pattern: /_URL$/,
    rule: {
      test: (v) => {
        try {
          new URL(v)
          return true
        } catch {
          return false
        }
      },
      message: 'Must be a valid URL (e.g., https://example.com)',
      severity: 'warn',
    },
  },
  {
    pattern: /_PORT$/,
    rule: {
      test: (v) => {
        const n = parseInt(v, 10)
        return !isNaN(n) && n >= 1 && n <= 65535 && String(n) === v
      },
      message: 'Must be a port number between 1 and 65535',
      severity: 'error',
    },
  },
  {
    pattern: /_(ENABLED|DISABLED)$/,
    rule: {
      test: (v) => v === 'true' || v === 'false',
      message: 'Must be "true" or "false"',
      severity: 'warn',
    },
  },
  {
    pattern: /_SECRET$/,
    rule: {
      test: (v) => v.length >= 16,
      message: 'Secret values should be at least 16 characters',
      severity: 'warn',
    },
  },
  {
    pattern: /_PASSWORD$/,
    rule: {
      test: (v) => v.length >= 8,
      message: 'Password values should be at least 8 characters',
      severity: 'warn',
    },
  },
  {
    pattern: /_EMAIL$/,
    rule: {
      test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Must be a valid email address',
      severity: 'warn',
    },
  },
]

/**
 * Validate a single env var value against its schema.
 * Returns a validation result if any rule fails, null if valid.
 */
export function validateEnvVar(
  key: string,
  value: string,
): EnvValidationResult | null {
  if (!value) return null // Empty values handled separately (required check)

  // Check known-schema rules first
  const schema = KNOWN_SCHEMAS[key]
  if (schema) {
    for (const rule of schema.rules) {
      if (!rule.test(value)) {
        return { key, value, severity: rule.severity, message: rule.message }
      }
    }
    return null
  }

  // Apply format-based rules to matching key patterns
  for (const { pattern, rule } of FORMAT_RULES) {
    if (pattern.test(key)) {
      if (!rule.test(value)) {
        return { key, value, severity: rule.severity, message: rule.message }
      }
      return null // Only apply the first matching format rule
    }
  }

  return null
}

/**
 * Check if a required env var is missing from the provided set.
 * Returns missing required var keys.
 */
export function getMissingRequired(
  variableKeys: string[],
): string[] {
  const keySet = new Set(variableKeys)
  return Object.entries(KNOWN_SCHEMAS)
    .filter(([key, schema]) => schema.required && !keySet.has(key))
    .map(([key]) => key)
}

/**
 * Validate an array of env vars and return all validation failures.
 */
export function validateEnvVars(
  variables: Array<{ key: string; value: string }>,
): EnvValidationResult[] {
  const results: EnvValidationResult[] = []

  for (const { key, value } of variables) {
    const result = validateEnvVar(key, value)
    if (result) results.push(result)
  }

  // Check required vars that are missing
  const keys = variables.filter((v) => v.value).map((v) => v.key)
  const missing = getMissingRequired(keys)
  for (const key of missing) {
    const schema = KNOWN_SCHEMAS[key]
    results.push({
      key,
      value: '',
      severity: 'error',
      message: `Required: ${schema.description}`,
    })
  }

  return results
}

/**
 * Get the schema entry for a known env var key, or undefined.
 */
export function getSchemaEntry(key: string): EnvVarSchemaEntry | undefined {
  return KNOWN_SCHEMAS[key]
}
