/**
 * SQL Emitter — Canvas state → Postgres DDL
 * SP-13.B20
 *
 * Re-exports and extends the core DDL functions from lib/schema-builder.ts.
 * This module is the canonical source for CREATE TABLE / ALTER / INDEX emission.
 */

export {
  generateAddFK,
  generateCreateTable,
  generateDropFK,
  generateDropIndexes,
  generateDropTable,
  generateForwardDDL,
  generateIndexes,
  generateReverseDDL,
  pgIdent,
  type CanvasColumn,
  type CanvasRelationship,
  type CanvasState,
  type CanvasTable,
} from '../schema-builder'

/**
 * Emit a complete forward SQL migration file body (header + DDL statements).
 * Returns a string suitable for writing to a .sql migration file.
 */
export function emitMigrationFile(
  state: import('../schema-builder').CanvasState,
  label?: string,
): string {
  const { generateForwardDDL: fwd } =
    require('../schema-builder') as typeof import('../schema-builder')
  const header = [
    `-- nSelf Visual Schema Builder migration`,
    label ? `-- label: ${label}` : null,
    `-- generated: ${new Date().toISOString()}`,
    `-- SP-13.B20`,
    ``,
  ]
    .filter((l) => l !== null)
    .join('\n')

  const body = fwd(state)
  return body ? `${header}\n${body}\n` : `${header}\n-- (empty canvas)\n`
}

/**
 * Emit a complete reverse SQL migration file body (header + DROP statements).
 */
export function emitRollbackFile(
  state: import('../schema-builder').CanvasState,
  label?: string,
): string {
  const { generateReverseDDL: rev } =
    require('../schema-builder') as typeof import('../schema-builder')
  const header = [
    `-- nSelf Visual Schema Builder ROLLBACK migration`,
    label ? `-- label: ${label}` : null,
    `-- generated: ${new Date().toISOString()}`,
    `-- SP-13.B20`,
    ``,
  ]
    .filter((l) => l !== null)
    .join('\n')

  const body = rev(state)
  return body ? `${header}\n${body}\n` : `${header}\n-- (empty canvas)\n`
}
