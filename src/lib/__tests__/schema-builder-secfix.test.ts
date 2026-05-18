/**
 * Security regression tests for S35-secfix remediations
 * R1: validateColumnType allowlist
 * R2: ColumnDefault typed model + emitDefaultClause + coerceStringDefault
 * R3: (covered by integration — execFile argv is a unit in apply/rollback routes)
 * R4/secfix2: schema-jobs POST raw-DDL rejection (see T-A in route test)
 *             + dollar-quote-tag-breakout proof (T-B, below)
 *
 * SP-13.B20
 */

import {
  coerceStringDefault,
  emitDefaultClause,
  generateCreateTable,
  generateForwardDDL,
  validateColumnType,
  type CanvasColumn,
  type CanvasState,
  type CanvasTable,
} from '../schema-builder'

// ─── R1: validateColumnType ───────────────────────────────────────────────────

describe('validateColumnType — allowlist (R1)', () => {
  // ── happy path ──
  it('accepts basic types', () => {
    expect(validateColumnType('text')).toBe('text')
    expect(validateColumnType('uuid')).toBe('uuid')
    expect(validateColumnType('integer')).toBe('integer')
    expect(validateColumnType('boolean')).toBe('boolean')
    expect(validateColumnType('jsonb')).toBe('jsonb')
    expect(validateColumnType('timestamptz')).toBe('timestamptz')
    expect(validateColumnType('double precision')).toBe('double precision')
  })

  it('accepts parametrized types', () => {
    expect(validateColumnType('varchar(255)')).toBe('varchar(255)')
    expect(validateColumnType('numeric(10,2)')).toBe('numeric(10,2)')
    expect(validateColumnType('char(1)')).toBe('char(1)')
  })

  it('accepts array type suffix', () => {
    expect(validateColumnType('text[]')).toBe('text[]')
    expect(validateColumnType('integer[]')).toBe('integer[]')
  })

  // ── injection PoC rejection ──
  it('rejects SQL injection via type: semicolon DDL append', () => {
    expect(() => validateColumnType('text; DROP TABLE users; --')).toThrow(/Invalid column type/)
  })

  it('rejects OS-command injection via type: backtick', () => {
    expect(() => validateColumnType('text`touch /tmp/pwned`')).toThrow(/Invalid column type/)
  })

  it('rejects unknown type that passes regex', () => {
    expect(() => validateColumnType('eviltype')).toThrow(/Unrecognized column type/)
  })

  it('rejects type starting with digit', () => {
    expect(() => validateColumnType('4evil')).toThrow(/Invalid column type/)
  })

  it('rejects empty string', () => {
    expect(() => validateColumnType('')).toThrow(/Invalid column type/)
  })

  it('rejects type with parenthesized shell expansion', () => {
    expect(() => validateColumnType('text($(id))')).toThrow(/Invalid column type/)
  })
})

// ─── R2: emitDefaultClause ────────────────────────────────────────────────────

describe('emitDefaultClause — typed model (R2)', () => {
  it('emits null for none', () => {
    expect(emitDefaultClause({ kind: 'none' })).toBeNull()
  })

  it('emits function call for now', () => {
    expect(emitDefaultClause({ kind: 'function', name: 'now' })).toBe('now()')
  })

  it('emits function call for gen_random_uuid', () => {
    expect(emitDefaultClause({ kind: 'function', name: 'gen_random_uuid' })).toBe(
      'gen_random_uuid()'
    )
  })

  it('emits function call for uuid_generate_v4', () => {
    expect(emitDefaultClause({ kind: 'function', name: 'uuid_generate_v4' })).toBe(
      'uuid_generate_v4()'
    )
  })

  it('emits bare numeric literal', () => {
    expect(emitDefaultClause({ kind: 'literal', value: 42 })).toBe('42')
    expect(emitDefaultClause({ kind: 'literal', value: 3.14 })).toBe('3.14')
  })

  it('emits bare boolean literal', () => {
    expect(emitDefaultClause({ kind: 'literal', value: true })).toBe('true')
    expect(emitDefaultClause({ kind: 'literal', value: false })).toBe('false')
  })

  it('emits dollar-quoted string literal for safe strings', () => {
    const out = emitDefaultClause({ kind: 'literal', value: 'hello world' })
    expect(out).toMatch(/^\$nself_default_\$hello world\$nself_default_\$$/)
  })

  it('rejects NaN numeric literal', () => {
    expect(() => emitDefaultClause({ kind: 'literal', value: NaN })).toThrow(/finite number/)
  })
})

// ─── R2: coerceStringDefault ──────────────────────────────────────────────────

describe('coerceStringDefault — injection payloads (R2)', () => {
  // ── injection PoC rejection via coerce + emit ──
  it('injection payload: semicolon DDL → dollar-quoted literal (safe)', () => {
    const cd = coerceStringDefault('0; DROP TABLE x; --')
    // coerced to literal string — dollar-quoted, no SQL execution risk
    expect(cd.kind).toBe('literal')
    const emitted = emitDefaultClause(cd)
    // must be wrapped in dollar-quote delimiters (not a bare SQL expression)
    expect(emitted).toMatch(/^\$nself_default_\$.*\$nself_default_\$$/)
    // the dangerous text is inside the dollar-quote, not an executable statement
    // verify it starts with the opening tag — meaning the SQL parser sees it as a string literal
    expect(emitted).toMatch(/^\$nself_default_\$0; DROP/)
  })

  it('injection payload: shell-expansion $(touch /tmp/p) → literal', () => {
    const cd = coerceStringDefault('$(touch /tmp/p)')
    expect(cd.kind).toBe('literal')
    const emitted = emitDefaultClause(cd)
    // wrapped in dollar-quote, not executable in SQL context
    expect(emitted).toMatch(/^\$nself_default_\$/)
  })

  it("injection payload: quote escape x'); DROP-- → literal", () => {
    const cd = coerceStringDefault("x'); DROP--")
    expect(cd.kind).toBe('literal')
    const emitted = emitDefaultClause(cd)
    expect(emitted).toMatch(/^\$nself_default_\$/)
  })

  // ── happy path coercion ──
  it('coerces now() to function', () => {
    const cd = coerceStringDefault('now()')
    expect(cd).toEqual({ kind: 'function', name: 'now' })
  })

  it('coerces gen_random_uuid() to function', () => {
    const cd = coerceStringDefault('gen_random_uuid()')
    expect(cd).toEqual({ kind: 'function', name: 'gen_random_uuid' })
  })

  it('coerces bare now to function', () => {
    const cd = coerceStringDefault('now')
    expect(cd).toEqual({ kind: 'function', name: 'now' })
  })

  it('coerces numeric string to literal number', () => {
    const cd = coerceStringDefault('42')
    expect(cd).toEqual({ kind: 'literal', value: 42 })
  })

  it('coerces "true"/"false" to literal boolean', () => {
    expect(coerceStringDefault('true')).toEqual({ kind: 'literal', value: true })
    expect(coerceStringDefault('false')).toEqual({ kind: 'literal', value: false })
  })
})

// ─── Integration: generateCreateTable with hardened path ─────────────────────

describe('generateCreateTable — hardened (R1 + R2)', () => {
  it('produces correct DDL for valid types + string defaults (happy path)', () => {
    const table: CanvasTable = {
      id: 't1',
      name: 'accounts',
      schema: 'public',
      x: 0,
      y: 0,
      columns: [
        {
          id: 'c1',
          name: 'id',
          type: 'uuid',
          nullable: false,
          default: 'gen_random_uuid()',
          isPrimaryKey: true,
        },
        {
          id: 'c2',
          name: 'created_at',
          type: 'timestamptz',
          nullable: false,
          default: 'now()',
          isPrimaryKey: false,
        },
        {
          id: 'c3',
          name: 'balance',
          type: 'numeric(10,2)',
          nullable: true,
          isPrimaryKey: false,
        },
      ] as CanvasColumn[],
    }
    const ddl = generateCreateTable(table)
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "accounts"')
    expect(ddl).toContain('"id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY')
    expect(ddl).toContain('"created_at" timestamptz NOT NULL DEFAULT now()')
    expect(ddl).toContain('"balance" numeric(10,2)')
    expect(ddl).not.toContain('NOT NULL"balance"')
  })

  it('throws for injected type — does not emit DDL', () => {
    const table: CanvasTable = {
      id: 't2',
      name: 'evil',
      schema: 'public',
      x: 0,
      y: 0,
      columns: [
        {
          id: 'c1',
          name: 'x',
          type: 'text); DROP TABLE users; --',
          nullable: false,
          isPrimaryKey: false,
        },
      ] as CanvasColumn[],
    }
    expect(() => generateCreateTable(table)).toThrow(/Invalid column type/)
  })

  it('generateForwardDDL throws for injected type in nested canvas', () => {
    const state: CanvasState = {
      tables: [
        {
          id: 't1',
          name: 'bad',
          schema: 'public',
          x: 0,
          y: 0,
          columns: [
            {
              id: 'c1',
              name: 'col',
              type: 'text; DROP TABLE np_users; --',
              nullable: false,
              isPrimaryKey: false,
            },
          ] as CanvasColumn[],
        },
      ],
      relationships: [],
    }
    expect(() => generateForwardDDL(state)).toThrow(/Invalid column type/)
  })
})

// ─── T-B: dollar-quote-tag-breakout — R4/secfix2 ─────────────────────────────
//
// If a string-literal default value itself contains the dollar-quote tag
// "$nself_default_$", the emitter must NOT produce a breakable dollar-quote
// (attacker could close the tag and inject raw SQL). The secfix code handles
// this via a value.includes('$nself_default_$') fallback to single-quote-doubling.
// This test proves the fallback fires and the output is not breakable.

describe('emitDefaultClause — dollar-quote-tag-breakout (R4/secfix2 T-B)', () => {
  it('falls back to single-quote-doubling when value contains the dollar-quote tag', () => {
    // Craft a string whose value contains the exact delimiter the emitter uses.
    // If NOT handled, emitDefaultClause would produce:
    //   $nself_default_$$nself_default_$<rest>$nself_default_$
    // which closes the outer tag prematurely — an injection breakout.
    const maliciousDefault = '$nself_default_$; DROP TABLE np_users; --'
    const cd = coerceStringDefault(maliciousDefault)
    expect(cd.kind).toBe('literal')

    const out = emitDefaultClause(cd)

    // Must NOT use dollar-quote (that would break out)
    expect(out).not.toMatch(/^\$nself_default_\$/)

    // Must use single-quote escaping (the safe fallback path)
    // The output is a single-quoted SQL literal: E'...' or '...'
    // Both are safe — verify it starts with a quote character
    expect(out).toMatch(/^'/)

    // The dangerous tag must appear inside the single-quoted literal —
    // still visible as data, not executable as SQL escape
    expect(out).toContain('$nself_default_$')

    // The entire output must be properly closed with a single-quote
    expect(out).toMatch(/'$/)
  })

  it('still uses dollar-quote for a safe string (no tag breakout risk)', () => {
    // Confirm the non-fallback path still works after the breakout guard
    const safeDefault = 'hello world'
    const cd = coerceStringDefault(safeDefault)
    const out = emitDefaultClause(cd)
    expect(out).toMatch(/^\$nself_default_\$hello world\$nself_default_\$$/)
  })
})
