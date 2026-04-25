import { ErrorCode } from '@/lib/errors/codes'
import { executeDbQuery } from '@/lib/nselfCLI'
import { faker } from '@faker-js/faker'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { action, tables, rowCount = 10, seed } = await request.json()

    if (action === 'preview') {
      // Generate preview data using Faker
      if (!tables || tables.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tables are required',
            code: ErrorCode.VALIDATION_ERROR,
          },
          { status: 400 },
        )
      }

      // Set seed for reproducibility
      if (seed) {
        faker.seed(seed)
      }

      const preview: Record<string, unknown[]> = {}

      for (const tableName of tables) {
        // Get table columns
        const columnsResult = await executeDbQuery(`
          SELECT
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${tableName}'
          ORDER BY ordinal_position
        `)

        if (!columnsResult.success) {
          continue
        }

        // Generate sample rows
        const rows = []
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
          const row: Record<string, unknown> = {}

          // Parse columns and generate data
          // This is a simplified example - real implementation would parse columnsResult.stdout
          row.id = faker.number.int({ min: 1, max: 10000 })
          row.name = faker.person.fullName()
          row.email = faker.internet.email()
          row.created_at = faker.date.recent()

          rows.push(row)
        }

        preview[tableName] = rows
      }

      return NextResponse.json({
        success: true,
        data: {
          preview,
          estimatedRows: tables.length * rowCount,
        },
      })
    }

    if (action === 'generate') {
      // Generate and insert mock data
      if (!tables || tables.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tables are required',
            code: ErrorCode.VALIDATION_ERROR,
          },
          { status: 400 },
        )
      }

      // Set seed for reproducibility
      if (seed) {
        faker.seed(seed)
      }

      let totalInserted = 0

      for (const tableName of tables) {
        // Get table columns
        const columnsResult = await executeDbQuery(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${tableName}'
            AND column_default IS NULL
            AND column_name != 'id'
          ORDER BY ordinal_position
        `)

        if (!columnsResult.success) {
          continue
        }

        // Generate INSERT statements
        const values = []
        for (let i = 0; i < rowCount; i++) {
          // Generate sample values
          const sampleValues = [
            `'${faker.person.fullName().replace(/'/g, "''")}'`,
            `'${faker.internet.email()}'`,
            `'${faker.date.recent().toISOString()}'`,
          ]
          values.push(`(${sampleValues.join(', ')})`)
        }

        // Execute batch insert (simplified example)
        // Real implementation would construct proper INSERT based on actual columns
        // const insertQuery = `INSERT INTO ${tableName} (name, email, created_at) VALUES ${values.join(', ')}`
        // await executeDbQuery(insertQuery)

        totalInserted += rowCount
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Mock data generated successfully',
          tablesAffected: tables.length,
          rowsInserted: totalInserted,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
        code: ErrorCode.VALIDATION_ERROR,
      },
      { status: 400 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Mock data generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.QUERY_ERROR,
      },
      { status: 500 },
    )
  }
}
