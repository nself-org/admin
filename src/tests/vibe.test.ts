/**
 * vibe.test.ts — Unit tests for Vibe-Code IDE (B41)
 *
 * Tests the core logic functions that underpin the vibe-code IDE:
 * - Prompt sanitization (injection guard)
 * - Session constraints (max sessions)
 * - Apply confirmation gate
 * - Stream event shape validation
 *
 * Framework: Jest (configured via jest.config.js)
 * Does NOT require a running vibe_api — all logic is pure or mocked.
 */

// ── Prompt sanitization ────────────────────────────────────────────────────────

function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(
      /;\s*(DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*;|ALTER\s+TABLE)/gi,
      '; [BLOCKED DDL]',
    )
    .trim()
}

describe('sanitizePrompt', () => {
  it('passes normal feature requests through unchanged', () => {
    const prompt = 'add a comments table with user_id and body'
    expect(sanitizePrompt(prompt)).toBe(prompt)
  })

  it('blocks DROP TABLE injection', () => {
    const prompt = 'add comments table; DROP TABLE np_users;'
    const result = sanitizePrompt(prompt)
    expect(result).not.toContain('DROP TABLE')
    expect(result).toContain('[BLOCKED DDL]')
  })

  it('blocks TRUNCATE injection', () => {
    const prompt = 'create a table; TRUNCATE np_users'
    const result = sanitizePrompt(prompt)
    expect(result).not.toContain('TRUNCATE')
    expect(result).toContain('[BLOCKED DDL]')
  })

  it('blocks ALTER TABLE injection', () => {
    const prompt = 'update schema; ALTER TABLE np_users DROP COLUMN email'
    const result = sanitizePrompt(prompt)
    expect(result).not.toContain('ALTER TABLE')
  })

  it('trims whitespace', () => {
    expect(sanitizePrompt('  hello  ')).toBe('hello')
  })
})

// ── Empty prompt guard ─────────────────────────────────────────────────────────

function validatePrompt(prompt: string): string | null {
  if (!prompt || !prompt.trim()) return 'ErrEmptyPrompt'
  return null
}

describe('validatePrompt', () => {
  it('returns ErrEmptyPrompt for empty string', () => {
    expect(validatePrompt('')).toBe('ErrEmptyPrompt')
  })

  it('returns ErrEmptyPrompt for whitespace-only', () => {
    expect(validatePrompt('   ')).toBe('ErrEmptyPrompt')
  })

  it('returns null for valid prompt', () => {
    expect(validatePrompt('add a table')).toBeNull()
  })
})

// ── Max sessions per user ─────────────────────────────────────────────────────

const MAX_SESSIONS = 3

function checkMaxSessions(count: number): string | null {
  if (count >= MAX_SESSIONS) return 'ErrMaxSessionsExceeded'
  return null
}

describe('checkMaxSessions', () => {
  it('allows up to 3 sessions', () => {
    expect(checkMaxSessions(0)).toBeNull()
    expect(checkMaxSessions(1)).toBeNull()
    expect(checkMaxSessions(2)).toBeNull()
  })

  it('blocks 4th session', () => {
    expect(checkMaxSessions(3)).toBe('ErrMaxSessionsExceeded')
  })
})

// ── Apply confirmation gate ────────────────────────────────────────────────────

function validateApply(params: {
  confirm: boolean
  targetEnv: 'local' | 'staging' | 'prod'
  confirmPhrase?: string
}): string | null {
  if (!params.confirm) return 'requires_confirmation'
  if (params.targetEnv === 'prod' && params.confirmPhrase !== 'confirm-prod') {
    return 'requires_prod_phrase'
  }
  return null
}

describe('validateApply', () => {
  it('requires confirm=true', () => {
    expect(validateApply({ confirm: false, targetEnv: 'local' })).toBe(
      'requires_confirmation',
    )
  })

  it('allows local apply with confirm=true', () => {
    expect(validateApply({ confirm: true, targetEnv: 'local' })).toBeNull()
  })

  it('allows staging apply with confirm=true', () => {
    expect(validateApply({ confirm: true, targetEnv: 'staging' })).toBeNull()
  })

  it('blocks prod apply without correct phrase', () => {
    expect(
      validateApply({
        confirm: true,
        targetEnv: 'prod',
        confirmPhrase: 'wrong',
      }),
    ).toBe('requires_prod_phrase')
  })

  it('allows prod apply with correct phrase', () => {
    expect(
      validateApply({
        confirm: true,
        targetEnv: 'prod',
        confirmPhrase: 'confirm-prod',
      }),
    ).toBeNull()
  })

  it('blocks prod apply with no phrase', () => {
    expect(validateApply({ confirm: true, targetEnv: 'prod' })).toBe(
      'requires_prod_phrase',
    )
  })
})

// ── Permissions JSON shape validation ─────────────────────────────────────────

interface HasuraPermission {
  type: string
  table: { schema: string; name: string }
  role: string
  select?: object
  insert?: object
  delete?: object
}

function validatePermissionsJSON(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const perm = data as Partial<HasuraPermission>
  return (
    typeof perm.type === 'string' &&
    typeof perm.table === 'object' &&
    perm.table !== null &&
    typeof (perm.table as { name?: unknown }).name === 'string' &&
    typeof perm.role === 'string'
  )
}

describe('validatePermissionsJSON', () => {
  it('accepts valid Hasura permission object', () => {
    const perm: HasuraPermission = {
      type: 'table',
      table: { schema: 'public', name: 'np_comments' },
      role: 'user',
      select: { columns: ['id', 'body'] },
    }
    expect(validatePermissionsJSON(perm)).toBe(true)
  })

  it('rejects null', () => {
    expect(validatePermissionsJSON(null)).toBe(false)
  })

  it('rejects missing role', () => {
    expect(
      validatePermissionsJSON({
        type: 'table',
        table: { schema: 'public', name: 'np_comments' },
      }),
    ).toBe(false)
  })

  it('rejects missing table name', () => {
    expect(
      validatePermissionsJSON({
        type: 'table',
        table: { schema: 'public' },
        role: 'user',
      }),
    ).toBe(false)
  })
})

// ── Stream chunk type guard ────────────────────────────────────────────────────

type StreamChunkType = 'token' | 'status' | 'done' | 'error'

function isValidStreamChunk(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const chunk = data as { type?: unknown; content?: unknown }
  const validTypes: StreamChunkType[] = ['token', 'status', 'done', 'error']
  return (
    typeof chunk.type === 'string' &&
    validTypes.includes(chunk.type as StreamChunkType) &&
    typeof chunk.content === 'string'
  )
}

describe('isValidStreamChunk', () => {
  it('accepts token chunk', () => {
    expect(isValidStreamChunk({ type: 'token', content: 'CREATE TABLE' })).toBe(
      true,
    )
  })

  it('accepts status chunk', () => {
    expect(
      isValidStreamChunk({
        type: 'status',
        content: 'Running migration agent...',
      }),
    ).toBe(true)
  })

  it('accepts done chunk', () => {
    expect(
      isValidStreamChunk({ type: 'done', content: 'Generation complete' }),
    ).toBe(true)
  })

  it('accepts error chunk', () => {
    expect(isValidStreamChunk({ type: 'error', content: 'Failed' })).toBe(true)
  })

  it('rejects unknown type', () => {
    expect(isValidStreamChunk({ type: 'unknown', content: 'x' })).toBe(false)
  })

  it('rejects missing content', () => {
    expect(isValidStreamChunk({ type: 'token' })).toBe(false)
  })
})
