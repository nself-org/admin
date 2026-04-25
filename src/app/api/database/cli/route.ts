import {
  nselfDbAnalyze,
  nselfDbBackup,
  nselfDbMigrate,
  nselfDbReset,
  nselfDbRestore,
  nselfDbSeed,
  nselfDbSync,
} from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * Database CLI operations - wraps nself db commands
 * All database management operations should go through nself CLI
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, options } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 },
      )
    }

    let result

    switch (action) {
      case 'sync':
        // nself db sync - sync Hasura metadata
        result = await nselfDbSync()
        break

      case 'seed':
        // nself db seed - seed database with initial data
        result = await nselfDbSeed({ force: options?.force })
        break

      case 'migrate':
        // nself db migrate - run database migrations
        result = await nselfDbMigrate({ target: options?.target })
        break

      case 'backup':
        // nself db backup - create database backup
        result = await nselfDbBackup(options?.outputPath)
        break

      case 'restore':
        // nself db restore - restore from backup
        if (!options?.backupPath) {
          return NextResponse.json(
            { success: false, error: 'Backup path is required for restore' },
            { status: 400 },
          )
        }
        result = await nselfDbRestore(options.backupPath)
        break

      case 'reset':
        // nself db reset - reset database
        result = await nselfDbReset({ force: options?.force })
        break

      case 'analyze':
        // nself db analyze - analyze database performance
        result = await nselfDbAnalyze()
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          action,
          output: result.stdout,
          stderr: result.stderr,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Database ${action} failed`,
          details: result.error || result.stderr,
          output: result.stdout,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint for database CLI status/info
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'status': {
        // Get database status via nself CLI
        const analyzeResult = await nselfDbAnalyze()
        return NextResponse.json({
          success: true,
          data: {
            output: analyzeResult.stdout,
            healthy: analyzeResult.success,
          },
        })
      }

      default:
        return NextResponse.json({
          success: true,
          data: {
            availableActions: [
              'sync',
              'seed',
              'migrate',
              'backup',
              'restore',
              'reset',
              'analyze',
            ],
            description:
              'Use POST with action parameter to execute database operations',
          },
        })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get database status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
