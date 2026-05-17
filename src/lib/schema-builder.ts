/**
 * Schema Builder — DDL Generator + Hasura Tracking
 * SP-13.B20
 */

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── R1: Type allowlist ───────────────────────────────────────────────────────

/** Regex gate: type token must start with a letter and contain only safe chars */
const COLUMN_TYPE_REGEX = /^[a-zA-Z][a-zA-Z0-9 ]*(\(\d+(,\d+)?\))?(\[\])?$/

/** Explicit set of base Postgres types (without parametrization) */
const ALLOWED_BASE_TYPES = new Set([
  'int', 'integer', 'bigint', 'smallint', 'serial', 'bigserial',
  'boolean', 'text', 'varchar', 'char', 'numeric', 'decimal',
  'real', 'double precision', 'date', 'timestamp', 'timestamptz',
  'time', 'uuid', 'jsonb', 'json', 'bytea', 'inet', 'cidr',
])

/**
 * Validate a column type string against the Postgres type allowlist.
 * Throws if the type is not recognized.
 * @param type Raw type string from CanvasColumn (e.g. "varchar(255)", "uuid")
 * @returns The validated type string unchanged
 */
export function validateColumnType(type: string): string {
  if (!COLUMN_TYPE_REGEX.test(type)) {
    throw new Error(
      `Invalid column type: "${type}". Only safe Postgres type tokens are allowed.`,
    )
  }
  // Strip optional parenthesized size and array suffix to get base type
  const base = type.replace(/\(\d+(,\d+)?\)/, '').replace(/\[\]$/, '').trim().toLowerCase()
  if (!ALLOWED_BASE_TYPES.has(base)) {
    throw new Error(
      `Unrecognized column type: "${type}". Allowed types: ${[...ALLOWED_BASE_TYPES].join(', ')}.`,
    )
  }
  return type
}

// ─── R2: Typed default model ──────────────────────────────────────────────────

/** Allowed SQL functions for DEFAULT clauses */
const ALLOWED_DEFAULT_FUNCTIONS = new Set([
  'now', 'gen_random_uuid', 'uuid_generate_v4', 'current_timestamp',
])

/** Allowed SQL function names for DEFAULT clauses — typed for exhaustive checks */
export type AllowedDefaultFunction = 'now' | 'gen_random_uuid' | 'uuid_generate_v4' | 'current_timestamp'

/**
 * Typed model for column DEFAULT values.
 * - none: no DEFAULT clause emitted
 * - literal: a validated string, number, or boolean literal
 * - function: a whitelisted SQL function call (no arguments)
 */
export type ColumnDefault =
  | { kind: 'none' }
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'function'; name: AllowedDefaultFunction }

/**
 * Emit the SQL fragment for a DEFAULT clause value.
 * Throws for invalid inputs.
 */
export function emitDefaultClause(def: ColumnDefault): string | null {
  if (def.kind === 'none') return null
  if (def.kind === 'function') {
    if (!ALLOWED_DEFAULT_FUNCTIONS.has(def.name)) {
      throw new Error(`Disallowed DEFAULT function: "${def.name}"`)
    }
    return `${def.name}()`
  }
  // literal
  const { value } = def
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('DEFAULT literal must be a finite number')
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  // string literal — dollar-quote to prevent injection
  // Use a tag that cannot appear in the value: if $tag$ appears in value,
  // fall back to single-quote escaping (double every single-quote)
  const tag = 'nself_default_'
  if (!value.includes(`$${tag}$`)) {
    return `$${tag}$${value}$${tag}$`
  }
  // Fallback: single-quote escape
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Coerce a legacy raw-string default to a typed ColumnDefault.
 * Used for callers that still pass string defaults from the canvas UI.
 * - Pure function name (now, gen_random_uuid, uuid_generate_v4, current_timestamp)
 *   with optional () → emitted as function call
 * - Numeric string → literal number
 * - "true"/"false" → literal boolean
 * - Anything else → literal string (dollar-quoted)
 */
export function coerceStringDefault(raw: string): ColumnDefault {
  const stripped = raw.trim().replace(/\(\)$/, '')
  if (ALLOWED_DEFAULT_FUNCTIONS.has(stripped)) {
    return {
      kind: 'function',
      name: stripped as AllowedDefaultFunction,
    }
  }
  const num = Number(raw.trim())
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return { kind: 'literal', value: num }
  }
  if (raw.trim() === 'true') return { kind: 'literal', value: true }
  if (raw.trim() === 'false') return { kind: 'literal', value: false }
  return { kind: 'literal', value: raw.trim() }
}

export interface CanvasColumn {
  id: string
  name: string
  type: string
  nullable: boolean
  /** Legacy string-based default (coerced via coerceStringDefault at DDL emit time) */
  default?: string
  isPrimaryKey: boolean
  /** Derived/display-only: true when this column is the source of an FK edge */
  isForeignKey?: boolean
  isUnique?: boolean
  hasIndex?: boolean
}

export interface CanvasTable {
  id: string
  name: string
  schema: string
  x: number
  y: number
  columns: CanvasColumn[]
}

export interface CanvasRelationship {
  id: string
  fromTableId: string
  fromColumnId: string
  toTableId: string
  toColumnId: string
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

export interface CanvasState {
  tables: CanvasTable[]
  relationships: CanvasRelationship[]
}

export interface SchemaJobRecord {
  id: string
  name: string
  status: 'pending' | 'applied' | 'rollback' | 'failed'
  forwardDDL: string
  reverseDDL: string
  hasuraTracked: boolean
  createdAt: string
  appliedAt?: string
  error?: string
}

// ─── DDL Generator ───────────────────────────────────────────────────────────

/**
 * Escape a PostgreSQL identifier (table or column name).
 */
export function pgIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/**
 * Generate CREATE TABLE DDL for a single canvas table.
 */
export function generateCreateTable(table: CanvasTable): string {
  if (!table.name.trim()) return ''
  const schemaPrefix =
    table.schema && table.schema !== 'public' ? `${pgIdent(table.schema)}.` : ''
  const tableFQN = `${schemaPrefix}${pgIdent(table.name)}`

  const colDefs = table.columns
    .filter((c) => c.name.trim())
    .map((col) => {
      // R1: validate type against allowlist before concatenation
      const validatedType = validateColumnType(col.type)
      let def = `  ${pgIdent(col.name)} ${validatedType}`
      if (!col.nullable) def += ' NOT NULL'
      // R2: coerce legacy string default to typed model, then emit safely
      if (col.default !== undefined && col.default !== '') {
        const typedDefault = coerceStringDefault(col.default)
        const clause = emitDefaultClause(typedDefault)
        if (clause !== null) def += ` DEFAULT ${clause}`
      }
      if (col.isPrimaryKey) def += ' PRIMARY KEY'
      return def
    })

  if (colDefs.length === 0) return ''

  return `CREATE TABLE IF NOT EXISTS ${tableFQN} (\n${colDefs.join(',\n')}\n);`
}

/**
 * Generate DROP TABLE DDL (reverse migration).
 */
export function generateDropTable(table: CanvasTable): string {
  const schemaPrefix =
    table.schema && table.schema !== 'public' ? `${pgIdent(table.schema)}.` : ''
  return `DROP TABLE IF EXISTS ${schemaPrefix}${pgIdent(table.name)} CASCADE;`
}

/**
 * Generate ALTER TABLE ADD CONSTRAINT for a foreign key relationship.
 */
export function generateAddFK(
  rel: CanvasRelationship,
  tables: CanvasTable[],
): string {
  const fromTable = tables.find((t) => t.id === rel.fromTableId)
  const toTable = tables.find((t) => t.id === rel.toTableId)
  if (!fromTable || !toTable) return ''
  const fromCol = fromTable.columns.find((c) => c.id === rel.fromColumnId)
  const toCol = toTable.columns.find((c) => c.id === rel.toColumnId)
  if (!fromCol || !toCol) return ''

  const fromFQN = pgIdent(fromTable.name)
  const toFQN = pgIdent(toTable.name)
  const constraintName = `fk_${fromTable.name}_${fromCol.name}_${toTable.name}_${toCol.name}`

  return (
    `ALTER TABLE ${fromFQN}\n` +
    `  ADD CONSTRAINT ${pgIdent(constraintName)}\n` +
    `  FOREIGN KEY (${pgIdent(fromCol.name)})\n` +
    `  REFERENCES ${toFQN} (${pgIdent(toCol.name)})\n` +
    `  ON DELETE ${rel.onDelete}\n` +
    `  ON UPDATE ${rel.onUpdate};`
  )
}

/**
 * Generate DROP CONSTRAINT DDL (reverse FK migration).
 */
export function generateDropFK(
  rel: CanvasRelationship,
  tables: CanvasTable[],
): string {
  const fromTable = tables.find((t) => t.id === rel.fromTableId)
  const toTable = tables.find((t) => t.id === rel.toTableId)
  if (!fromTable || !toTable) return ''
  const fromCol = fromTable.columns.find((c) => c.id === rel.fromColumnId)
  const toCol = toTable.columns.find((c) => c.id === rel.toColumnId)
  if (!fromCol || !toCol) return ''

  const constraintName = `fk_${fromTable.name}_${fromCol.name}_${toTable.name}_${toCol.name}`
  return `ALTER TABLE ${pgIdent(fromTable.name)} DROP CONSTRAINT IF EXISTS ${pgIdent(constraintName)};`
}

/**
 * Generate CREATE INDEX DDL for columns marked with hasIndex.
 */
export function generateIndexes(table: CanvasTable): string[] {
  return table.columns
    .filter((c) => c.hasIndex && !c.isPrimaryKey && c.name.trim())
    .map((col) => {
      const idxName = `idx_${table.name}_${col.name}`
      const unique = col.isUnique ? 'UNIQUE ' : ''
      return `CREATE ${unique}INDEX IF NOT EXISTS ${pgIdent(idxName)} ON ${pgIdent(table.name)} (${pgIdent(col.name)});`
    })
}

/**
 * Generate DROP INDEX DDL (reverse migration).
 */
export function generateDropIndexes(table: CanvasTable): string[] {
  return table.columns
    .filter((c) => c.hasIndex && !c.isPrimaryKey && c.name.trim())
    .map((col) => {
      const idxName = `idx_${table.name}_${col.name}`
      return `DROP INDEX IF EXISTS ${pgIdent(idxName)};`
    })
}

/**
 * Generate complete forward migration DDL from canvas state.
 */
export function generateForwardDDL(state: CanvasState): string {
  const parts: string[] = []

  for (const table of state.tables) {
    const create = generateCreateTable(table)
    if (create) parts.push(create)
    const indexes = generateIndexes(table)
    parts.push(...indexes)
  }

  for (const rel of state.relationships) {
    const fk = generateAddFK(rel, state.tables)
    if (fk) parts.push(fk)
  }

  return parts.join('\n\n')
}

/**
 * Generate complete reverse migration DDL from canvas state.
 */
export function generateReverseDDL(state: CanvasState): string {
  const parts: string[] = []

  for (const rel of state.relationships) {
    const drop = generateDropFK(rel, state.tables)
    if (drop) parts.push(drop)
  }

  for (const table of [...state.tables].reverse()) {
    const dropIdxs = generateDropIndexes(table)
    parts.push(...dropIdxs)
    parts.push(generateDropTable(table))
  }

  return parts.join('\n\n')
}

// ─── Hasura Tracking ─────────────────────────────────────────────────────────

export interface HasuraTrackTableInput {
  schema: string
  name: string
}

export interface HasuraTrackRelationshipInput {
  table: string
  schema: string
  name: string
  using: {
    foreign_key_constraint_on: {
      column: string
      table: { schema: string; name: string }
    }
  }
}

/**
 * Build Hasura metadata API payload to track a table.
 */
export function buildHasuraTrackTablePayload(
  table: HasuraTrackTableInput,
): object {
  return {
    type: 'pg_track_table',
    args: {
      source: 'default',
      schema: table.schema || 'public',
      name: table.name,
    },
  }
}

/**
 * Build Hasura metadata API payload to track an array relationship.
 */
export function buildHasuraTrackRelationshipPayload(
  input: HasuraTrackRelationshipInput,
): object {
  return {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: input.schema, name: input.table },
      name: input.name,
      using: input.using,
    },
  }
}

/**
 * Call Hasura metadata API to track tables and relationships.
 * hasuraUrl: e.g. http://localhost:8080
 * adminSecret: Hasura admin secret
 */
export async function trackInHasura(
  state: CanvasState,
  hasuraUrl: string,
  adminSecret: string,
): Promise<{ tracked: string[]; errors: string[] }> {
  const tracked: string[] = []
  const errors: string[] = []

  for (const table of state.tables) {
    if (!table.name.trim()) continue
    try {
      const payload = buildHasuraTrackTablePayload({
        schema: table.schema || 'public',
        name: table.name,
      })
      const res = await fetch(`${hasuraUrl}/v1/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': adminSecret,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        errors.push(`Track ${table.name}: ${body}`)
      } else {
        tracked.push(table.name)
      }
    } catch (err) {
      errors.push(
        `Track ${table.name}: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }
  }

  return { tracked, errors }
}

// ─── ID Helpers ──────────────────────────────────────────────────────────────

let _counter = 0
export function generateId(prefix = 'id'): string {
  _counter += 1
  return `${prefix}_${Date.now()}_${_counter}`
}

export function resetIdCounter(): void {
  _counter = 0
}
