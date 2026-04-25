// database/route.ts — CLI-First: all DB ops route through `nself db *` CLI commands.
// Direct pg.Client connections are forbidden per nSelf Hard Rule (App -> Hasura -> Postgres).
import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

// Valid PostgreSQL identifier pattern (table/schema names)
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function validateIdentifier(name: string): boolean {
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'stats': {
        // Delegate to `nself db stats --json`
        const result = await executeNselfCommand('db', ['stats', '--json'])
        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to retrieve database stats',
              details: result.error,
            },
            { status: 500 },
          )
        }
        const data = JSON.parse(result.stdout || '{}')
        return NextResponse.json({ success: true, data })
      }

      case 'tables': {
        // Delegate to `nself db tables --json`
        const result = await executeNselfCommand('db', ['tables', '--json'])
        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to retrieve table list',
              details: result.error,
            },
            { status: 500 },
          )
        }
        const tables = JSON.parse(result.stdout || '[]')
        return NextResponse.json({ success: true, data: tables })
      }

      case 'table-data': {
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

        // Delegate to `nself db query --json` with a safe parameterised-equivalent query.
        // Identifiers are validated above; pass them as separate args not interpolated into SQL.
        const result = await executeNselfCommand('db', [
          'table-data',
          '--table',
          tableName,
          '--schema',
          schema,
          '--limit',
          String(limit),
          '--offset',
          String(offset),
          '--json',
        ])

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to retrieve table data',
              details: result.error,
            },
            { status: 500 },
          )
        }

        const data = JSON.parse(result.stdout || '{}')
        return NextResponse.json({ success: true, data })
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
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const body = await request.json()
  const { query, allowDangerous } = body

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  // Block dangerous DDL unless explicitly allowed
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

  try {
    // Delegate to `nself db query --sql <query> --json`
    const result = await executeNselfCommand('db', [
      'query',
      '--sql',
      query,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query execution failed',
          details: result.error,
        },
        { status: 500 },
      )
    }

    const data = JSON.parse(result.stdout || '{}')
    return NextResponse.json({ success: true, data })
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
  }
}
