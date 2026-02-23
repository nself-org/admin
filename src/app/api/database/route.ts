import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

// Valid PostgreSQL identifier pattern (table/schema names)
// Must start with letter or underscore, followed by letters, digits, underscores
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function validateIdentifier(name: string): boolean {
  // Check pattern and reasonable length
  return name.length <= 63 && VALID_IDENTIFIER.test(name)
}

// Dangerous SQL patterns to block in the query editor
const DANGEROUS_PATTERNS = [
  /^\s*DROP\s+/i,
  /^\s*TRUNCATE\s+/i,
  /^\s*DELETE\s+FROM\s+\S+\s*$/i, // DELETE without WHERE
  /^\s*ALTER\s+/i,
  /^\s*CREATE\s+/i,
  /;\s*DROP\s+/i,
  /;\s*TRUNCATE\s+/i,
  /;\s*DELETE\s+/i,
  /;\s*ALTER\s+/i,
]

function isDangerousQuery(query: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(query))
}

// Get database connection from environment
const getDbClient = () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres-dev-password',
    database: process.env.POSTGRES_DB || 'nself',
  })
  return client
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  let client: Client | null = null

  try {
    client = getDbClient()
    await client.connect()

    switch (action) {
      case 'stats': {
        // Get database statistics
        const sizeResult = await client.query(`
          SELECT pg_database_size(current_database()) as size
        `)

        const tablesResult = await client.query(`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `)

        const viewsResult = await client.query(`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'VIEW'
        `)

        const connectionsResult = await client.query(`
          SELECT COUNT(*) as count FROM pg_stat_activity 
          WHERE datname = current_database()
        `)

        const versionResult = await client.query('SELECT version()')

        const uptimeResult = await client.query(`
          SELECT NOW() - pg_postmaster_start_time() as uptime
        `)

        return NextResponse.json({
          success: true,
          data: {
            size: formatBytes(sizeResult.rows[0].size),
            tables: parseInt(tablesResult.rows[0].count),
            views: parseInt(viewsResult.rows[0].count),
            connections: parseInt(connectionsResult.rows[0].count),
            version:
              versionResult.rows[0].version.split(' ')[0] +
              ' ' +
              versionResult.rows[0].version.split(' ')[1],
            uptime: formatUptime(uptimeResult.rows[0].uptime),
          },
        })
      }

      case 'tables': {
        // Get all tables and views with metadata
        const result = await client.query(`
          SELECT 
            t.table_name as name,
            t.table_schema as schema,
            t.table_type as type,
            COALESCE(s.n_live_tup, 0) as row_count,
            pg_size_pretty(pg_total_relation_size('"'||t.table_schema||'"."'||t.table_name||'"')) as size,
            COUNT(c.column_name) as columns
          FROM information_schema.tables t
          LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
          LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
          WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
          GROUP BY t.table_name, t.table_schema, t.table_type, s.n_live_tup
          ORDER BY t.table_schema, t.table_name
        `)

        const tables = result.rows.map((row) => ({
          name: row.name,
          schema: row.schema,
          type: row.type === 'BASE TABLE' ? 'table' : 'view',
          rowCount: parseInt(row.row_count || 0),
          size: row.size,
          columns: parseInt(row.columns),
        }))

        return NextResponse.json({
          success: true,
          data: tables,
        })
      }

      case 'table-data': {
        // Get data from a specific table
        const tableName = searchParams.get('table')
        const schema = searchParams.get('schema') || 'public'
        const limitStr = searchParams.get('limit') || '100'
        const offsetStr = searchParams.get('offset') || '0'

        if (!tableName) {
          return NextResponse.json(
            { error: 'Table name is required' },
            { status: 400 },
          )
        }

        // Validate identifiers to prevent SQL injection
        if (!validateIdentifier(tableName)) {
          return NextResponse.json(
            { error: 'Invalid table name' },
            { status: 400 },
          )
        }

        if (!validateIdentifier(schema)) {
          return NextResponse.json(
            { error: 'Invalid schema name' },
            { status: 400 },
          )
        }

        // Validate limit and offset are positive integers
        const limit = parseInt(limitStr, 10)
        const offset = parseInt(offsetStr, 10)
        if (
          isNaN(limit) ||
          isNaN(offset) ||
          limit < 1 ||
          limit > 1000 ||
          offset < 0
        ) {
          return NextResponse.json(
            { error: 'Invalid limit or offset' },
            { status: 400 },
          )
        }

        // Validate table exists and get columns
        const columnsResult = await client.query(
          `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `,
          [schema, tableName],
        )

        if (columnsResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Table not found' },
            { status: 404 },
          )
        }

        // Get table data (identifiers already validated above)
        const dataResult = await client.query(
          `SELECT * FROM "${schema}"."${tableName}" LIMIT $1 OFFSET $2`,
          [limit, offset],
        )

        // Get total count
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
        )

        return NextResponse.json({
          success: true,
          data: {
            columns: columnsResult.rows,
            rows: dataResult.rows,
            totalCount: parseInt(countResult.rows[0].count),
            limit,
            offset,
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database operation failed',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  } finally {
    if (client) {
      await client.end()
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json()
  const { query, allowDangerous } = body

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  // Check for dangerous operations unless explicitly allowed
  if (!allowDangerous && isDangerousQuery(query)) {
    return NextResponse.json(
      {
        error: 'Potentially dangerous query blocked',
        details:
          'DROP, TRUNCATE, DELETE (without WHERE), ALTER, and CREATE operations are blocked. ' +
          'Use nself CLI for database management operations.',
      },
      { status: 403 },
    )
  }

  let client: Client | null = null

  try {
    client = getDbClient()
    await client.connect()

    const startTime = Date.now()
    const result = await client.query(query)
    const executionTime = Date.now() - startTime

    // Determine if it's a SELECT query or not
    const isSelect = query.trim().toUpperCase().startsWith('SELECT')

    if (isSelect) {
      return NextResponse.json({
        success: true,
        data: {
          columns: result.fields.map((field: any) => field.name),
          rows: result.rows,
          rowCount: result.rowCount,
          executionTime: `${executionTime}ms`,
        },
      })
    } else {
      return NextResponse.json({
        success: true,
        data: {
          rowCount: result.rowCount,
          command: result.command,
          executionTime: `${executionTime}ms`,
        },
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Query execution failed',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  } finally {
    if (client) {
      await client.end()
    }
  }
}

// Helper functions
function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatUptime(interval: any): string {
  // Parse PostgreSQL interval format
  if (!interval) return 'Unknown'

  // Handle interval object
  if (typeof interval === 'object' && interval !== null) {
    if (interval.days !== undefined) {
      const days = interval.days || 0
      const hours = interval.hours || 0
      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`
      }
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    // Convert object to string
    interval = String(interval)
  }

  // Convert to string if not already
  const intervalStr = String(interval)

  // Try to match PostgreSQL interval format
  const match = intervalStr.match(/(\d+) days? (\d+):(\d+):(\d+)/)
  if (match) {
    const days = parseInt(match[1])
    const hours = parseInt(match[2])
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  // Try simpler format
  const simpleMatch = intervalStr.match(/(\d+):(\d+):(\d+)/)
  if (simpleMatch) {
    const hours = parseInt(simpleMatch[1])
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return intervalStr
}
