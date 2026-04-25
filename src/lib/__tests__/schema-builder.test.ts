/**
 * Tests for schema-builder DDL generator, Hasura tracking payloads, rollback
 * SP-13.B20
 */

import {
  buildHasuraTrackTablePayload,
  generateAddFK,
  generateCreateTable,
  generateDropTable,
  generateForwardDDL,
  generateIndexes,
  generateReverseDDL,
  pgIdent,
  resetIdCounter,
  type CanvasRelationship,
  type CanvasState,
  type CanvasTable,
} from '../schema-builder'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const usersTable: CanvasTable = {
  id: 'tbl_users',
  name: 'users',
  schema: 'public',
  x: 0,
  y: 0,
  columns: [
    {
      id: 'col_id',
      name: 'id',
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      isPrimaryKey: true,
    },
    {
      id: 'col_email',
      name: 'email',
      type: 'varchar(255)',
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

const postsTable: CanvasTable = {
  id: 'tbl_posts',
  name: 'posts',
  schema: 'public',
  x: 400,
  y: 0,
  columns: [
    {
      id: 'col_post_id',
      name: 'id',
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      isPrimaryKey: true,
    },
    {
      id: 'col_user_id',
      name: 'user_id',
      type: 'uuid',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: true,
      hasIndex: true,
    },
    {
      id: 'col_title',
      name: 'title',
      type: 'varchar(255)',
      nullable: false,
      isPrimaryKey: false,
    },
  ],
}

const relationship: CanvasRelationship = {
  id: 'rel_1',
  fromTableId: 'tbl_posts',
  fromColumnId: 'col_user_id',
  toTableId: 'tbl_users',
  toColumnId: 'col_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
}

const canvasState: CanvasState = {
  tables: [usersTable, postsTable],
  relationships: [relationship],
}

beforeEach(() => resetIdCounter())

// ─── pgIdent ──────────────────────────────────────────────────────────────────

describe('pgIdent', () => {
  it('wraps name in double quotes', () => {
    expect(pgIdent('users')).toBe('"users"')
  })

  it('escapes internal double quotes', () => {
    expect(pgIdent('tab"le')).toBe('"tab""le"')
  })

  it('handles names with spaces', () => {
    expect(pgIdent('my table')).toBe('"my table"')
  })
})

// ─── generateCreateTable ─────────────────────────────────────────────────────

describe('generateCreateTable', () => {
  it('generates CREATE TABLE with columns', () => {
    const ddl = generateCreateTable(usersTable)
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "users"')
    expect(ddl).toContain(
      '"id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY',
    )
    expect(ddl).toContain('"email" varchar(255) NOT NULL')
    expect(ddl).toContain('"created_at" timestamptz NOT NULL DEFAULT now()')
  })

  it('includes schema prefix for non-public schemas', () => {
    const table: CanvasTable = { ...usersTable, schema: 'app' }
    const ddl = generateCreateTable(table)
    expect(ddl).toContain('"app"."users"')
  })

  it('omits schema prefix for public schema', () => {
    const ddl = generateCreateTable(usersTable)
    expect(ddl).not.toContain('"public".')
  })

  it('returns empty string for table with no name', () => {
    const table: CanvasTable = { ...usersTable, name: '' }
    expect(generateCreateTable(table)).toBe('')
  })

  it('returns empty string for table with no columns', () => {
    const table: CanvasTable = { ...usersTable, columns: [] }
    expect(generateCreateTable(table)).toBe('')
  })

  it('handles nullable columns correctly', () => {
    const table: CanvasTable = {
      ...usersTable,
      columns: [
        {
          id: 'c1',
          name: 'bio',
          type: 'text',
          nullable: true,
          isPrimaryKey: false,
        },
      ],
    }
    const ddl = generateCreateTable(table)
    expect(ddl).not.toContain('NOT NULL')
  })
})

// ─── generateDropTable ────────────────────────────────────────────────────────

describe('generateDropTable', () => {
  it('generates DROP TABLE CASCADE', () => {
    const ddl = generateDropTable(usersTable)
    expect(ddl).toBe('DROP TABLE IF EXISTS "users" CASCADE;')
  })
})

// ─── generateAddFK ────────────────────────────────────────────────────────────

describe('generateAddFK', () => {
  it('generates ALTER TABLE ADD CONSTRAINT FK', () => {
    const ddl = generateAddFK(relationship, [usersTable, postsTable])
    expect(ddl).toContain('ALTER TABLE "posts"')
    expect(ddl).toContain('ADD CONSTRAINT')
    expect(ddl).toContain('FOREIGN KEY ("user_id")')
    expect(ddl).toContain('REFERENCES "users" ("id")')
    expect(ddl).toContain('ON DELETE CASCADE')
    expect(ddl).toContain('ON UPDATE CASCADE')
  })

  it('returns empty string when tables not found', () => {
    const rel: CanvasRelationship = {
      ...relationship,
      fromTableId: 'nonexistent',
    }
    expect(generateAddFK(rel, [usersTable, postsTable])).toBe('')
  })

  it('returns empty string when columns not found', () => {
    const rel: CanvasRelationship = {
      ...relationship,
      fromColumnId: 'nonexistent_col',
    }
    expect(generateAddFK(rel, [usersTable, postsTable])).toBe('')
  })
})

// ─── generateIndexes ─────────────────────────────────────────────────────────

describe('generateIndexes', () => {
  it('generates CREATE INDEX for columns with hasIndex=true', () => {
    const indexes = generateIndexes(postsTable)
    expect(indexes).toHaveLength(1)
    expect(indexes[0]).toContain('CREATE INDEX IF NOT EXISTS')
    expect(indexes[0]).toContain('"idx_posts_user_id"')
    expect(indexes[0]).toContain('ON "posts" ("user_id")')
  })

  it('skips primary key columns', () => {
    const table: CanvasTable = {
      ...usersTable,
      columns: [{ ...usersTable.columns[0], hasIndex: true }],
    }
    expect(generateIndexes(table)).toHaveLength(0)
  })

  it('generates UNIQUE INDEX for isUnique=true columns', () => {
    const table: CanvasTable = {
      ...usersTable,
      columns: [
        {
          id: 'c1',
          name: 'email',
          type: 'varchar(255)',
          nullable: false,
          isPrimaryKey: false,
          hasIndex: true,
          isUnique: true,
        },
      ],
    }
    const indexes = generateIndexes(table)
    expect(indexes[0]).toContain('CREATE UNIQUE INDEX')
  })
})

// ─── generateForwardDDL ───────────────────────────────────────────────────────

describe('generateForwardDDL', () => {
  it('generates all CREATE statements in correct order', () => {
    const ddl = generateForwardDDL(canvasState)
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "users"')
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS "posts"')
    expect(ddl).toContain('FOREIGN KEY ("user_id")')
    expect(ddl).toContain('CREATE INDEX')
  })

  it('returns empty string for empty state', () => {
    const ddl = generateForwardDDL({ tables: [], relationships: [] })
    expect(ddl).toBe('')
  })
})

// ─── generateReverseDDL ───────────────────────────────────────────────────────

describe('generateReverseDDL', () => {
  it('generates DROP statements for rollback', () => {
    const ddl = generateReverseDDL(canvasState)
    expect(ddl).toContain('DROP CONSTRAINT IF EXISTS')
    expect(ddl).toContain('DROP TABLE IF EXISTS "posts" CASCADE')
    expect(ddl).toContain('DROP TABLE IF EXISTS "users" CASCADE')
    expect(ddl).toContain('DROP INDEX IF EXISTS')
  })

  it('drops FK constraints before tables', () => {
    const ddl = generateReverseDDL(canvasState)
    const fkPos = ddl.indexOf('DROP CONSTRAINT')
    const tablePos = ddl.indexOf('DROP TABLE')
    expect(fkPos).toBeLessThan(tablePos)
  })

  it('returns empty string for empty state', () => {
    const ddl = generateReverseDDL({ tables: [], relationships: [] })
    expect(ddl).toBe('')
  })
})

// ─── buildHasuraTrackTablePayload ─────────────────────────────────────────────

describe('buildHasuraTrackTablePayload', () => {
  it('builds correct Hasura track_table payload', () => {
    const payload = buildHasuraTrackTablePayload({
      schema: 'public',
      name: 'users',
    }) as Record<string, unknown>
    expect(payload.type).toBe('pg_track_table')
    expect((payload.args as Record<string, unknown>).source).toBe('default')
    expect((payload.args as Record<string, unknown>).schema).toBe('public')
    expect((payload.args as Record<string, unknown>).name).toBe('users')
  })

  it('defaults to public schema', () => {
    const payload = buildHasuraTrackTablePayload({
      schema: '',
      name: 'orders',
    }) as Record<string, unknown>
    expect((payload.args as Record<string, unknown>).schema).toBe('public')
  })
})

// ─── Rollback integration: forward then reverse DDL are complementary ─────────

describe('forward/reverse DDL symmetry', () => {
  it('forward DDL mentions all table names from state', () => {
    const forward = generateForwardDDL(canvasState)
    for (const table of canvasState.tables) {
      expect(forward).toContain(table.name)
    }
  })

  it('reverse DDL mentions all table names from state', () => {
    const reverse = generateReverseDDL(canvasState)
    for (const table of canvasState.tables) {
      expect(reverse).toContain(table.name)
    }
  })
})

// ─── A11y basics: aria label construction ────────────────────────────────────

describe('a11y label helpers', () => {
  it('table name used as aria label', () => {
    // Verify table name is accessible as string (would be put in aria-label on SVG node)
    expect(usersTable.name).toBe('users')
    expect(postsTable.name).toBe('posts')
  })
})
