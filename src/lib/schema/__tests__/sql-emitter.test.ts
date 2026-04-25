/**
 * Tests for lib/schema/sql-emitter.ts
 * SP-13.B20
 *
 * Covers:
 * - DDL emit functions (re-exported from schema-builder)
 * - emitMigrationFile / emitRollbackFile output format
 * - Round-trip JSON canvas state ↔ SQL correctness
 */

import {
  emitMigrationFile,
  emitRollbackFile,
  generateForwardDDL,
  generateReverseDDL,
  pgIdent,
  type CanvasState,
  type CanvasTable,
} from '../sql-emitter'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ordersTable: CanvasTable = {
  id: 'tbl_orders',
  name: 'orders',
  schema: 'public',
  x: 0,
  y: 0,
  columns: [
    {
      id: 'col_order_id',
      name: 'id',
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      isPrimaryKey: true,
    },
    {
      id: 'col_total',
      name: 'total',
      type: 'numeric',
      nullable: false,
      isPrimaryKey: false,
    },
    {
      id: 'col_created_at',
      name: 'created_at',
      type: 'timestamptz',
      nullable: false,
      default: 'now()',
      isPrimaryKey: false,
    },
  ],
}

const itemsTable: CanvasTable = {
  id: 'tbl_items',
  name: 'order_items',
  schema: 'public',
  x: 400,
  y: 0,
  columns: [
    {
      id: 'col_item_id',
      name: 'id',
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      isPrimaryKey: true,
    },
    {
      id: 'col_order_ref',
      name: 'order_id',
      type: 'uuid',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: true,
      hasIndex: true,
    },
    {
      id: 'col_sku',
      name: 'sku',
      type: 'varchar(100)',
      nullable: false,
      isPrimaryKey: false,
      isUnique: true,
      hasIndex: true,
    },
  ],
}

const fkRel = {
  id: 'rel_items_orders',
  fromTableId: 'tbl_items',
  fromColumnId: 'col_order_ref',
  toTableId: 'tbl_orders',
  toColumnId: 'col_order_id',
  onDelete: 'CASCADE' as const,
  onUpdate: 'NO ACTION' as const,
}

const canvasState: CanvasState = {
  tables: [ordersTable, itemsTable],
  relationships: [fkRel],
}

// ─── Re-exported function smoke tests ─────────────────────────────────────────

describe('pgIdent (re-export)', () => {
  it('double-quotes identifier', () => {
    expect(pgIdent('orders')).toBe('"orders"')
  })

  it('escapes internal double quotes', () => {
    expect(pgIdent('foo"bar')).toBe('"foo""bar"')
  })
})

describe('generateForwardDDL (re-export)', () => {
  it('contains all CREATE TABLE statements', () => {
    const ddl = generateForwardDDL(canvasState)
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "orders"')
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "order_items"')
  })

  it('contains FK constraint', () => {
    const ddl = generateForwardDDL(canvasState)
    expect(ddl).toContain('FOREIGN KEY ("order_id")')
    expect(ddl).toContain('REFERENCES "orders" ("id")')
    expect(ddl).toContain('ON DELETE CASCADE')
    expect(ddl).toContain('ON UPDATE NO ACTION')
  })

  it('contains indexes for indexed columns', () => {
    const ddl = generateForwardDDL(canvasState)
    expect(ddl).toContain(
      'CREATE INDEX IF NOT EXISTS "idx_order_items_order_id"',
    )
    expect(ddl).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_items_sku"',
    )
  })
})

describe('generateReverseDDL (re-export)', () => {
  it('drops FK before tables', () => {
    const ddl = generateReverseDDL(canvasState)
    const fkPos = ddl.indexOf('DROP CONSTRAINT')
    const tablePos = ddl.indexOf('DROP TABLE')
    expect(fkPos).toBeLessThan(tablePos)
  })

  it('drops all tables', () => {
    const ddl = generateReverseDDL(canvasState)
    expect(ddl).toContain('DROP TABLE IF EXISTS "orders" CASCADE')
    expect(ddl).toContain('DROP TABLE IF EXISTS "order_items" CASCADE')
  })

  it('drops indexes', () => {
    const ddl = generateReverseDDL(canvasState)
    expect(ddl).toContain('DROP INDEX IF EXISTS')
  })
})

// ─── emitMigrationFile ────────────────────────────────────────────────────────

describe('emitMigrationFile', () => {
  it('includes header comment lines', () => {
    const sql = emitMigrationFile(canvasState, 'test_migration')
    expect(sql).toContain('-- nSelf Visual Schema Builder migration')
    expect(sql).toContain('-- label: test_migration')
    expect(sql).toContain('-- SP-13.B20')
    expect(sql).toMatch(/-- generated: \d{4}-\d{2}-\d{2}/)
  })

  it('includes DDL body after header', () => {
    const sql = emitMigrationFile(canvasState)
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "orders"')
    expect(sql).toContain('FOREIGN KEY ("order_id")')
  })

  it('omits label line when no label provided', () => {
    const sql = emitMigrationFile(canvasState)
    expect(sql).not.toContain('-- label:')
  })

  it('emits empty-canvas placeholder for empty state', () => {
    const sql = emitMigrationFile({ tables: [], relationships: [] })
    expect(sql).toContain('-- (empty canvas)')
  })

  it('ends with newline', () => {
    const sql = emitMigrationFile(canvasState)
    expect(sql.endsWith('\n')).toBe(true)
  })
})

// ─── emitRollbackFile ─────────────────────────────────────────────────────────

describe('emitRollbackFile', () => {
  it('includes rollback header comment', () => {
    const sql = emitRollbackFile(canvasState, 'test_rollback')
    expect(sql).toContain('-- nSelf Visual Schema Builder ROLLBACK migration')
    expect(sql).toContain('-- label: test_rollback')
  })

  it('includes DROP statements', () => {
    const sql = emitRollbackFile(canvasState)
    expect(sql).toContain('DROP TABLE IF EXISTS')
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS')
  })

  it('emits empty-canvas placeholder for empty state', () => {
    const sql = emitRollbackFile({ tables: [], relationships: [] })
    expect(sql).toContain('-- (empty canvas)')
  })

  it('ends with newline', () => {
    const sql = emitRollbackFile(canvasState)
    expect(sql.endsWith('\n')).toBe(true)
  })
})

// ─── Round-trip: JSON canvas state ↔ SQL ──────────────────────────────────────

describe('round-trip JSON ↔ SQL', () => {
  it('serializing canvas state to JSON and back yields identical DDL', () => {
    const forward1 = generateForwardDDL(canvasState)

    // Serialize and deserialize the canvas state
    const serialized = JSON.stringify(canvasState)
    const deserialized = JSON.parse(serialized) as CanvasState

    const forward2 = generateForwardDDL(deserialized)
    expect(forward1).toBe(forward2)
  })

  it('reverse DDL from deserialized state matches original', () => {
    const rev1 = generateReverseDDL(canvasState)
    const deserialized = JSON.parse(JSON.stringify(canvasState)) as CanvasState
    const rev2 = generateReverseDDL(deserialized)
    expect(rev1).toBe(rev2)
  })

  it('forward and reverse DDL mention the same table names', () => {
    const fwd = generateForwardDDL(canvasState)
    const rev = generateReverseDDL(canvasState)

    for (const table of canvasState.tables) {
      expect(fwd).toContain(table.name)
      expect(rev).toContain(table.name)
    }
  })

  it('forward DDL for single-table state has no FK constraints', () => {
    const singleTable: CanvasState = {
      tables: [ordersTable],
      relationships: [],
    }
    const ddl = generateForwardDDL(singleTable)
    expect(ddl).not.toContain('FOREIGN KEY')
    expect(ddl).not.toContain('ADD CONSTRAINT')
  })

  it('all column types from canvas appear in DDL', () => {
    const ddl = generateForwardDDL(canvasState)
    const allTypes = canvasState.tables
      .flatMap((t) => t.columns)
      .map((c) => c.type)
      .filter((t, i, arr) => arr.indexOf(t) === i)

    for (const type of allTypes) {
      expect(ddl).toContain(type)
    }
  })

  it('emitMigrationFile wraps identical DDL content as generateForwardDDL', () => {
    const rawDDL = generateForwardDDL(canvasState)
    const fileContent = emitMigrationFile(canvasState, 'roundtrip')
    // The file content must include all of rawDDL verbatim
    expect(fileContent).toContain(rawDDL)
  })

  it('nullable columns have no NOT NULL in DDL', () => {
    const nullableState: CanvasState = {
      tables: [
        {
          id: 'tbl_prefs',
          name: 'user_prefs',
          schema: 'public',
          x: 0,
          y: 0,
          columns: [
            {
              id: 'c_id',
              name: 'id',
              type: 'uuid',
              nullable: false,
              isPrimaryKey: true,
            },
            {
              id: 'c_bio',
              name: 'bio',
              type: 'text',
              nullable: true,
              isPrimaryKey: false,
            },
          ],
        },
      ],
      relationships: [],
    }
    const ddl = generateForwardDDL(nullableState)
    // bio should appear without NOT NULL
    const bioLine = ddl.split('\n').find((l) => l.includes('"bio"'))
    expect(bioLine).toBeDefined()
    expect(bioLine).not.toContain('NOT NULL')
  })
})
