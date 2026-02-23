import { readEnvFile } from '@/lib/env-handler'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const env = await readEnvFile()

    if (!env) {
      return NextResponse.json({ env: null }, { status: 200 })
    }

    return NextResponse.json({ env })
  } catch (error) {
    console.error('Error reading env file:', error)
    return NextResponse.json(
      {
        error: 'Failed to read env file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
