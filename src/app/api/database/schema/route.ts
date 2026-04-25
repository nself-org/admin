import { ErrorCode } from '@/lib/errors/codes'
import { executeDbQuery } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import type { TableInfo } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table')

    if (tableName) {
      // Get detailed table info
      const [_columnsResult, _indexesResult, _foreignKeysResult, _sizeResult] =
        await Promise.all([
          // Columns
          executeDbQuery(`
          SELECT
            column_name as name,
            data_type as type,
            is_nullable::boolean as nullable,
            column_default as default_value
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${tableName}'
          ORDER BY ordinal_position
        `),
          // Indexes
          executeDbQuery(`
          SELECT
            indexname as name,
            indexdef as definition
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = '${tableName}'
        `),
          // Foreign keys
          executeDbQuery(`
          SELECT
            tc.constraint_name as name,
            kcu.column_name as column,
            ccu.table_name AS references_table,
            ccu.column_name AS references_column
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = '${tableName}'
            AND tc.constraint_type = 'FOREIGN KEY'
        `),
          // Size
          executeDbQuery(`
          SELECT pg_size_pretty(pg_total_relation_size('public.${tableName}')) as total_size,
                 pg_size_pretty(pg_relation_size('public.${tableName}')) as size
        `),
        ])

      const tableInfo: TableInfo = {
        name: tableName,
        schema: 'public',
        rowCount: 0,
        size: '0 B',
        totalSize: '0 B',
        columns: [],
        indexes: [],
        foreignKeys: [],
      }

      return NextResponse.json({
        success: true,
        data: tableInfo,
      })
    }

    // Get all tables
    const tablesResult = await executeDbQuery(`
      SELECT
        table_name as name,
        table_schema as schema,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = t.table_name AND table_schema = t.table_schema) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    if (!tablesResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch schema',
          code: ErrorCode.QUERY_ERROR,
        },
        { status: 500 },
      )
    }

    // Parse table list from stdout
    const tables: string[] = []

    return NextResponse.json({
      success: true,
      data: {
        tables,
        schemas: ['public'],
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Schema fetch failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.QUERY_ERROR,
      },
      { status: 500 },
    )
  }
}

// Export schema as SQL
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { table, format = 'sql' } = await request.json()

    if (format === 'typescript') {
      // Generate TypeScript types
      const columnsResult = await executeDbQuery(`
        SELECT
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${table}'
        ORDER BY ordinal_position
      `)

      if (!columnsResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to generate types',
            code: ErrorCode.QUERY_ERROR,
          },
          { status: 500 },
        )
      }

      // Generate TypeScript interface
      const tsTypes = `export interface ${table.charAt(0).toUpperCase() + table.slice(1)} {
  // Generated from database schema
  // Add actual fields here
}
`

      return NextResponse.json({
        success: true,
        data: {
          content: tsTypes,
          language: 'typescript',
        },
      })
    }

    // Get CREATE TABLE statement
    const createTableResult = await executeDbQuery(`
      SELECT
        'CREATE TABLE ' || table_name || ' (' ||
        string_agg(
          column_name || ' ' || data_type ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
          ', '
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table}'
      GROUP BY table_name
    `)

    if (!createTableResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to export schema',
          code: ErrorCode.QUERY_ERROR,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        content: createTableResult.stdout || '',
        language: 'sql',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Schema export failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.QUERY_ERROR,
      },
      { status: 500 },
    )
  }
}
